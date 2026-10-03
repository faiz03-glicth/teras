#!/usr/bin/env node
// Teras Maestro runner for the orchestration loop. Runs flows one by one, reruns each failure
// once (flaky check) and prints a compact summary meant to be read by the lead agent.
//   node .maestro/tools/run.mjs doctor
//   node .maestro/tools/run.mjs all                       (read-only flows/ only, never writes/)
//   node .maestro/tools/run.mjs flow .maestro/flows/06-profile.yaml
//   node .maestro/tools/run.mjs flow .maestro/writes/04-routine-save-delete.yaml --allow-writes
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLOWS = join(ROOT, 'flows');
const WRITES = join(ROOT, 'writes');
const REPORTS = join(ROOT, 'reports');
const APP_ID = process.env.TERAS_APP_ID || 'com.faiz.teras.local';
const METRO_URL = 'http://localhost:8081/status';
const ADB = process.env.ADB_PATH || join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const MAX_MESSAGE = 160;

const q = (arg) => `"${String(arg).replace(/"/g, '\\"')}"`;
const sh = (cmd, args) => spawnSync(`${cmd} ${args.map(q).join(' ')}`, { encoding: 'utf8', shell: true });
const firstLine = (text) => (text || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('WARNING:'))[0] || '';
const isInside = (file, dir) => file === dir || file.startsWith(dir + sep);

function listFlows(target) {
  if (statSync(target).isFile()) return [resolve(target)];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const full = join(target, entry.name);
    if (entry.isDirectory()) return listFlows(full);
    return /\.ya?ml$/.test(entry.name) && !entry.name.startsWith('_') ? [full] : [];
  });
}

function failureMessage(junitPath, result) {
  try {
    const xml = readFileSync(junitPath, 'utf8');
    const match = xml.match(/<failure[^>]*message="([^"]*)"/) || xml.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
    if (match) return firstLine(match[1]).slice(0, MAX_MESSAGE);
  } catch {
    // no junit file written; fall back to the process output below
  }
  return firstLine(result.stderr || result.stdout).slice(0, MAX_MESSAGE) || 'unknown failure';
}

function runFlow(file, attempt) {
  const name = relative(ROOT, file).replace(/[\\/]/g, '_').replace(/\.ya?ml$/, '');
  const out = join(REPORTS, `${name}.a${attempt}`);
  mkdirSync(out, { recursive: true });
  const junit = join(out, 'junit.xml');
  const started = Date.now();
  const result = sh('maestro', ['test', file, '--format', 'junit', '--output', junit, '--debug-output', join(out, 'debug')]);
  const ok = result.status === 0;
  return { name, ok, seconds: +((Date.now() - started) / 1000).toFixed(1), message: ok ? '' : failureMessage(junit, result), evidence: out };
}

function runAll(files) {
  const rows = files.map((file) => {
    const first = runFlow(file, 1);
    if (first.ok) return { ...first, status: 'PASS' };
    const second = runFlow(file, 2);
    return second.ok
      ? { ...second, status: 'FLAKY', message: `failed once: ${first.message}`, evidence: first.evidence }
      : { ...second, status: 'FAIL' };
  });
  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(REPORTS, 'summary.json'), JSON.stringify(rows, null, 2));
  for (const row of rows) {
    const detail = row.status === 'PASS' ? '' : ` | ${row.message} | evidence: ${row.evidence}`;
    console.log(`${row.status.padEnd(5)} ${row.name} (${row.seconds}s)${detail}`);
  }
  const count = (status) => rows.filter((row) => row.status === status).length;
  console.log(`RESULT: ${count('PASS')} pass, ${count('FLAKY')} flaky, ${count('FAIL')} fail`);
  return count('FAIL') === 0 ? 0 : 1;
}

async function metroRunning() {
  try {
    const res = await fetch(METRO_URL, { signal: AbortSignal.timeout(3000) });
    return (await res.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

async function doctor() {
  let missing = 0;
  const check = (label, ok, fix) => {
    console.log(`${ok ? 'OK     ' : 'MISSING'} ${label}${ok ? '' : ` -> ${fix}`}`);
    if (!ok) missing++;
  };
  check('maestro CLI', sh('maestro', ['--version']).status === 0, 'install Maestro and add it to PATH (https://maestro.mobile.dev)');
  const online = (sh(ADB, ['devices']).stdout || '').split(/\r?\n/).filter((line) => /\tdevice$/.test(line));
  check(`adb device connected (${online.length})`, online.length >= 1, 'enable USB debugging, accept the prompt on the phone, use a data cable');
  if (online.length) {
    const installed = (sh(ADB, ['shell', 'pm', 'list', 'packages', APP_ID]).stdout || '').includes(`package:${APP_ID}`);
    check(`app installed (${APP_ID})`, installed, 'install the dev build (npm run android), or set TERAS_APP_ID');
    const reversed = (sh(ADB, ['reverse', '--list']).stdout || '').includes('tcp:8081');
    check('adb reverse tcp:8081', reversed, 'run: adb reverse tcp:8081 tcp:8081');
  }
  check('Metro running on :8081', await metroRunning(), 'run: npx expo start');
  return missing === 0 ? 0 : 1;
}

function requireDevice() {
  const online = (sh(ADB, ['devices']).stdout || '').split(/\r?\n/).filter((line) => /\tdevice$/.test(line));
  if (online.length > 0) return;
  console.error('ENVIRONMENT: no adb device connected. Reconnect the phone, accept USB debugging, run: adb reverse tcp:8081 tcp:8081, then retry.');
  process.exit(3);
}

const args = process.argv.slice(2);
const allowWrites = args.includes('--allow-writes');
const [command, target] = args.filter((arg) => !arg.startsWith('--'));

if (command === 'doctor') process.exit(await doctor());
if (command === 'all' || command === 'flow') requireDevice();
if (command === 'all') process.exit(runAll(listFlows(FLOWS)));
if (command === 'flow' && target) {
  const resolved = resolve(target);
  if (isInside(resolved, WRITES) && (!allowWrites || statSync(resolved).isDirectory())) {
    console.error('REFUSED: writes/ flows wipe data or send real email. Pass ONE file and --allow-writes after the owner approves.');
    process.exit(2);
  }
  process.exit(runAll(listFlows(resolved)));
}
console.error('usage: run.mjs doctor | all | flow <file-or-dir> [--allow-writes]');
process.exit(2);
