#!/usr/bin/env node
// End-to-end check of the Streak ↔ Teras date sync: drives both apps on the phone with Maestro and, between
// steps, reads the live database (service role) and Teras's SQLite on the phone to see each change land.
//
// WRITES DATA to the signed-in account: one Workout check-in and one short workout on a past day with
// nothing on it, both removed again by the test itself (the removals are part of what it checks).
//
//   node .maestro/e2e/streak-sync/run.mjs                          picks an empty day 14+ days back
//   node .maestro/e2e/streak-sync/run.mjs --day 2026-09-10
//   node .maestro/e2e/streak-sync/run.mjs --cleanup --day 2026-09-10   undo a run that stopped half way
//   --teras-app com.faiz.teras.local --teras-scheme teras-local       Teras Local, on Metro 8081
//   --streak-app com.faiz.streak.local --streak-scheme streak-local    a local Streak build
//
// Defaults: SandBoxTeras (the EAS preview build) and the installed Streak. Needs both signed in to the same
// account, Streak's Sync switched on, and `.env.e2e` (git-ignored) with SUPABASE_SERVICE_ROLE_KEY and
// E2E_EMAIL. The key only goes to this project's Supabase URL and is never printed. Teras's own SQLite is
// read only from a debug build (Teras Local); a release build's is private, and its screen says the same.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const REPORTS = join(ROOT, '.maestro', 'reports', 'streak-sync');
const ADB =
  process.env.ADB_PATH || join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const POLL_MS = 2000;
const WAIT_MS = 60_000;
/** Far enough back that a check-in queues no reminder (the server's window is two days). */
const FIRST_CANDIDATE_DAYS_BACK = 14;
const LAST_CANDIDATE_DAYS_BACK = 60;

class Stop extends Error {}

// ── Arguments and settings ──
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : fallback;
};
const cleanupOnly = argv.includes('--cleanup');
const terasApp = option('teras-app', 'com.faiz.teras.sandbox');
const terasScheme = option('teras-scheme', 'teras-sandbox');
const streakApp = option('streak-app', 'com.faiz.streak');
const streakScheme = option('streak-scheme', 'streak');

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
  );
}
const env = { ...readEnv(join(ROOT, '.env')), ...readEnv(join(ROOT, '.env.e2e')) };
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = env.E2E_EMAIL;

// ── Output ──
const log = (status, text) => console.log(`${status.padEnd(5)} ${text}`);
function stop(text, detail) {
  log('FAIL', text);
  if (detail !== undefined) console.log(`      saw: ${JSON.stringify(detail)}`);
  throw new Stop(text);
}

// ── Dates ──
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysBack = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

// ── Live database (service role, read only) ──
async function rest(path) {
  const headers = { apikey: KEY };
  // Legacy service_role keys are JWTs and go in Authorization too; new secret keys go in apikey only.
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;
  const response = await fetch(`${SUPABASE_URL}${path}`, { headers });
  if (!response.ok) throw new Error(`${path.split('?')[0]} answered HTTP ${response.status}`);
  return response.json();
}

/** The id the server gives the check-in it makes from a Teras day (0005: md5 of account and date). */
function terasCheckInId(userId, day) {
  const hex = createHash('md5').update(`teras:${userId}:${day}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function findUserId(email) {
  const { users } = await rest('/auth/v1/admin/users?page=1&per_page=1000');
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

async function serverDay(userId, day) {
  const [checkIns, days, reminders] = await Promise.all([
    rest(
      `/rest/v1/check_ins?select=id,source,deleted_at&user_id=eq.${userId}&date=eq.${day}&activity_id=eq.workout`,
    ),
    rest(`/rest/v1/workout_days?select=sets&user_id=eq.${userId}&date=eq.${day}`),
    rest(`/rest/v1/workout_reminders?select=date&user_id=eq.${userId}&date=eq.${day}`),
  ]);
  const terasId = terasCheckInId(userId, day);
  const teras = checkIns.find((c) => c.id === terasId);
  return {
    streak: checkIns.filter((c) => c.source === null).map((c) => ({ deleted: c.deleted_at !== null })),
    teras: teras ? { source: teras.source, deleted: teras.deleted_at !== null } : null,
    sets: days[0]?.sets ?? 0,
    reminders: reminders.length,
  };
}

async function pickDay(userId) {
  const from = daysBack(LAST_CANDIDATE_DAYS_BACK);
  const to = daysBack(FIRST_CANDIDATE_DAYS_BACK);
  const range = `user_id=eq.${userId}&date=gte.${from}&date=lte.${to}`;
  const [checkIns, days] = await Promise.all([
    rest(`/rest/v1/check_ins?select=date&${range}`),
    rest(`/rest/v1/workout_days?select=date&${range}&sets=gt.0`),
  ]);
  const taken = new Set([...checkIns, ...days].map((row) => row.date));
  for (let back = FIRST_CANDIDATE_DAYS_BACK; back <= LAST_CANDIDATE_DAYS_BACK; back += 1) {
    if (!taken.has(daysBack(back))) return daysBack(back);
  }
  return null;
}

// ── Teras's SQLite on the phone: readable through run-as from a debug build only; null otherwise ──
function deviceDay(userId, day) {
  const dir = mkdtempSync(join(tmpdir(), 'teras-db-'));
  try {
    for (const name of ['teras.db', 'teras.db-wal']) {
      const copy = spawnSync(ADB, ['exec-out', 'run-as', terasApp, 'cat', `files/SQLite/${name}`], {
        maxBuffer: 256 * 1024 * 1024,
      });
      if (copy.status !== 0 || /not debuggable|run-as:/.test(copy.stdout.toString('utf8', 0, 200)))
        return null;
      writeFileSync(join(dir, name), copy.stdout);
    }
    const db = new DatabaseSync(join(dir, 'teras.db'));
    try {
      const synced = db
        .prepare('select user_id from streak_sync')
        .all()
        .map((row) => row.user_id);
      const has = db.prepare('select 1 from streak_days where user_id = ? and date = ?').get(userId, day);
      return { pulledFor: synced.includes(userId), hasDay: has !== undefined };
    } finally {
      db.close();
    }
  } finally {
    // The copy holds the person's data: never left behind.
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Phone ──
const quote = (arg) => `"${String(arg).replace(/"/g, '\\"')}"`;
function maestro(flow, day) {
  const out = join(REPORTS, `${Date.now()}-${basename(flow, '.yaml')}`);
  mkdirSync(out, { recursive: true });
  const args = [
    ['DAY', day],
    ['TERAS_APP', terasApp],
    ['TERAS_SCHEME', terasScheme],
    ['STREAK_APP', streakApp],
    ['STREAK_SCHEME', streakScheme],
  ].flatMap(([key, value]) => ['-e', `${key}=${value}`]);
  const command = `maestro ${['test', ...args, '--debug-output', out, join(HERE, flow)].map(quote).join(' ')}`;
  const run = spawnSync(command, { encoding: 'utf8', shell: true });
  const lines = `${run.stdout}\n${run.stderr}`
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('WARNING'));
  return { ok: run.status === 0, out, tail: lines.slice(-6).join('\n      ') };
}

async function waitFor(read, expected) {
  const deadline = Date.now() + WAIT_MS;
  let seen;
  for (;;) {
    seen = await read();
    if (expected(seen)) return { ok: true, seen };
    if (Date.now() > deadline) return { ok: false, seen };
    await new Promise((done) => setTimeout(done, POLL_MS));
  }
}

const STEPS = [
  {
    name: 'Streak: check in a Workout',
    flow: 'streak-check-in.yaml',
    server: [
      'one Streak check-in, live; no reminder for an old day',
      (s) => s.streak.length === 1 && !s.streak[0].deleted && s.reminders === 0,
    ],
  },
  {
    name: 'Teras: pulls it; the day says "Checked in on Streak"',
    flow: 'teras-sees-streak.yaml',
    device: ['the day in streak_days, pulled for this account', (d) => d.hasDay && d.pulledFor],
  },
  {
    name: 'Teras: "Log this workout" starts a workout on that day (not finished)',
    flow: 'teras-start.yaml',
    server: ['nothing sent while the workout runs', (s) => s.sets === 0],
  },
  {
    name: 'Streak: deletes its check-in',
    flow: 'streak-delete.yaml',
    server: [
      'the Streak check-in soft-deleted',
      (s) => s.streak.length > 0 && s.streak.every((c) => c.deleted),
    ],
  },
  {
    name: 'Teras: finishes; the server makes a Teras check-in',
    flow: 'teras-finish.yaml',
    server: [
      'workout_days has sets; a live check-in from Teras',
      (s) => s.sets > 0 && s.teras?.source === 'teras' && !s.teras.deleted,
    ],
    device: ['the deleted day gone from streak_days', (d) => !d.hasDay],
  },
  { name: 'Streak: shows the check-in Teras made', flow: 'streak-sees-teras.yaml' },
  {
    name: 'Teras: deletes the workout; the server withdraws its check-in',
    flow: 'teras-delete.yaml',
    server: [
      'workout_days back to 0 sets; the Teras check-in soft-deleted',
      (s) => s.sets === 0 && s.teras?.deleted === true,
    ],
  },
  { name: 'Streak: the day is empty again', flow: 'streak-empty.yaml' },
];

async function runStep(step, userId, day) {
  const phone = maestro(step.flow, day);
  if (!phone.ok) stop(`${step.name}: the flow failed (${phone.out})\n      ${phone.tail}`);
  if (step.server) {
    const [what, expected] = step.server;
    const result = await waitFor(() => serverDay(userId, day), expected);
    if (!result.ok) stop(`${step.name}: database never showed ${what}`, result.seen);
  }
  if (step.device && deviceDay(userId, day) === null) {
    log(
      'SKIP',
      `${step.name}: ${terasApp} is a release build, so its database can't be read (the screen checked it)`,
    );
  } else if (step.device) {
    const [what, expected] = step.device;
    const result = await waitFor(async () => deviceDay(userId, day), expected);
    if (!result.ok) stop(`${step.name}: the phone's database never showed ${what}`, result.seen);
  }
  log('PASS', step.name);
}

async function preflight() {
  if (!SUPABASE_URL) stop('EXPO_PUBLIC_SUPABASE_URL is missing from .env');
  if (!KEY || !EMAIL) stop('.env.e2e needs SUPABASE_SERVICE_ROLE_KEY=… and E2E_EMAIL=… (it is git-ignored)');
  const devices = spawnSync(ADB, ['devices'], { encoding: 'utf8' }).stdout ?? '';
  if (!/\tdevice\b/.test(devices)) stop('no phone connected over adb');
  const packages = spawnSync(ADB, ['shell', 'pm', 'list', 'packages'], { encoding: 'utf8' }).stdout ?? '';
  const installed = new Set(packages.split(/\r?\n/).map((line) => line.replace('package:', '').trim()));
  for (const app of [terasApp, streakApp]) if (!installed.has(app)) stop(`${app} is not installed`);
  if (terasApp.endsWith('.local')) {
    const metro = await fetch('http://localhost:8081/status')
      .then((r) => r.text())
      .catch(() => '');
    if (!metro.includes('packager-status:running')) stop('Metro is not running on 8081 (npm start)');
    spawnSync(ADB, ['reverse', 'tcp:8081', 'tcp:8081']);
  }
  const userId = await findUserId(EMAIL);
  if (!userId) stop('no account with the email in E2E_EMAIL');
  return userId;
}

async function cleanup(userId, day) {
  log('', `cleaning up ${day} through both apps`);
  for (const flow of ['cleanup-teras.yaml', 'cleanup-streak.yaml']) {
    const phone = maestro(flow, day);
    log(phone.ok ? 'OK' : 'WARN', `${flow}${phone.ok ? '' : ` failed (${phone.out})`}`);
  }
  const settled = await waitFor(
    () => serverDay(userId, day),
    (s) => s.sets === 0 && s.streak.every((c) => c.deleted) && (!s.teras || s.teras.deleted),
  );
  log(settled.ok ? 'OK' : 'WARN', `database for ${day}: ${JSON.stringify(settled.seen)}`);
}

async function main() {
  const userId = await preflight();
  const day = option('day', null) ?? (await pickDay(userId));
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) stop('no test day: pass --day YYYY-MM-DD');
  if (cleanupOnly) return cleanup(userId, day);

  const before = await serverDay(userId, day);
  if (before.sets > 0 || before.streak.some((c) => !c.deleted) || (before.teras && !before.teras.deleted)) {
    stop(`${day} already has a workout or a check-in; pick an empty day`, before);
  }
  log('', `testing on ${day} with ${terasApp} and ${streakApp}; everything it adds is removed again`);
  try {
    for (const step of STEPS) await runStep(step, userId, day);
    log('PASS', 'Streak ↔ Teras sync, both ways, adds and removals');
  } catch (error) {
    await cleanup(userId, day);
    throw error;
  }
}

main().catch((error) => {
  if (!(error instanceof Stop)) log('FAIL', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
