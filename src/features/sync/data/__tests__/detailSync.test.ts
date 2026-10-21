import { eq } from 'drizzle-orm';

import {
  exercises,
  syncTombstones,
  workoutExercises,
  workouts,
  workoutSets,
  type DetailTable,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import { AppError } from '@/core/errors/AppError';

import { createTestDatabase } from '@test/db/createTestDatabase';

import { DELETE_CHUNK, PUSH_PAGE, RemoteDetailSyncRepository } from '../DetailSyncRepository';
import { createDetailSyncDao, type DetailRow } from '../local/detailSyncDao';
import type { DetailApi } from '../remote/detailApi';

const USER = '00000000-0000-0000-0000-0000000000a1';
const OTHER = '00000000-0000-0000-0000-0000000000b2';
const T0 = '2026-10-20T10:00:00.000Z';
const T1 = '2026-10-20T11:40:00.000Z';
const stamps = { createdAt: T0, updatedAt: T0 };

interface Call {
  kind: 'upsert' | 'delete';
  table: DetailTable;
  ids: string[];
  rows?: readonly DetailRow[];
  deletedAt?: string;
}

/** A server that records what it was sent; `refuse` and `fail` make it say no. */
function fakeApi(options: { refuse?: (row: DetailRow) => boolean; fail?: () => Error | null } = {}) {
  const calls: Call[] = [];
  const api: DetailApi = {
    async upsert(table, rows) {
      const failure = options.fail?.();
      if (failure) throw failure;
      if (options.refuse && rows.some(options.refuse)) throw new AppError('Rejected', 'refused');
      calls.push({ kind: 'upsert', table, ids: rows.map((row) => String(row.id)), rows });
    },
    async markDeleted(table, _userId, ids, deletedAt) {
      calls.push({ kind: 'delete', table, ids: [...ids], deletedAt });
    },
  };
  return { api, calls };
}

function addWorkout(
  db: AppDatabase,
  key: string,
  options: { userId?: string; ended?: boolean; sets?: number } = {},
) {
  const userId = options.userId ?? USER;
  db.insert(workouts)
    .values({
      id: `w${key}`,
      userId,
      ...stamps,
      name: 'Push Day',
      routineId: 'push',
      date: '2026-10-20',
      startedAt: T0,
      endedAt: options.ended === false ? null : T1,
      bodyweightKg: 70.5,
    })
    .run();
  db.insert(workoutExercises)
    .values({
      id: `we${key}`,
      userId,
      ...stamps,
      workoutId: `w${key}`,
      exerciseId: 'bench-press-barbell',
      position: 0,
      restSeconds: 120,
    })
    .run();
  for (let i = 0; i < (options.sets ?? 1); i += 1) {
    db.insert(workoutSets)
      .values({
        id: `s${key}-${String(i).padStart(4, '0')}`,
        userId,
        ...stamps,
        workoutExerciseId: `we${key}`,
        position: i,
        weightKg: 60,
        reps: 8,
        status: 'done',
      })
      .run();
  }
}

async function setup(api: DetailApi) {
  const db = await createTestDatabase();
  const repo = new RemoteDetailSyncRepository({ dao: createDetailSyncDao(db), api });
  return { db, repo };
}

const dirtyCount = (db: AppDatabase) =>
  [workouts, workoutExercises, workoutSets].reduce(
    (sum, table) => sum + db.select().from(table).where(eq(table.dirty, true)).all().length,
    0,
  );

describe('sending workout detail to teras-detail', () => {
  it('sends a finished workout, its exercise and its set, parents first, as the server stores them', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1');

    const result = await repo.pushPending(USER);

    expect(result).toEqual({ sent: 3, refused: 0, deleted: 0 });
    expect(calls.map((call) => `${call.table}:${call.ids.join(',')}`)).toEqual([
      'workouts:w1',
      'workout_exercises:we1',
      'workout_sets:s1-0000',
    ]);
    expect(calls[0]?.rows?.[0]).toEqual({
      user_id: USER,
      id: 'w1',
      name: 'Push Day',
      routine_id: 'push',
      date: '2026-10-20',
      started_at: T0,
      ended_at: T1,
      bodyweight_kg: 70.5,
      created_at: T0,
      updated_at: T0,
      deleted_at: null,
    });
    expect(dirtyCount(db)).toBe(0);
  });

  it('keeps a running workout on the phone until it ends', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1', { ended: false });

    await repo.pushPending(USER);
    expect(calls).toHaveLength(0);

    db.update(workouts).set({ endedAt: T1, updatedAt: T1 }).where(eq(workouts.id, 'w1')).run();
    await repo.pushPending(USER);
    expect(calls.map((call) => call.table)).toEqual(['workouts', 'workout_exercises', 'workout_sets']);
  });

  it('sends only this person’s rows', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, 'other', { userId: OTHER });

    await repo.pushPending(USER);

    expect(calls).toHaveLength(0);
  });

  it('sends custom exercises with true booleans and a muscle list, never the built-in ones', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    db.insert(exercises)
      .values({
        id: 'c1',
        userId: USER,
        ...stamps,
        name: 'Landmine Press',
        equipment: 'barbell',
        primaryMuscle: 'shoulders',
        secondaryMuscles: ['triceps', 'chest'],
        type: 'weighted',
        isCompound: true,
        isCustom: true,
      })
      .run();

    await repo.pushPending(USER);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.rows?.[0]).toMatchObject({
      id: 'c1',
      secondary_muscles: ['triceps', 'chest'],
      is_compound: true,
      is_custom: true,
    });
  });

  it('sends a long history a page at a time', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1', { sets: PUSH_PAGE + 1 });

    const result = await repo.pushPending(USER);

    const setCalls = calls.filter((call) => call.table === 'workout_sets');
    expect(setCalls.map((call) => call.ids.length)).toEqual([PUSH_PAGE, 1]);
    expect(result.sent).toBe(PUSH_PAGE + 3);
    expect(dirtyCount(db)).toBe(0);
  });

  it('sends the rest when the server refuses one row, and keeps that one marked', async () => {
    const { api, calls } = fakeApi({ refuse: (row) => row.id === 's1-0001' });
    const { db, repo } = await setup(api);
    addWorkout(db, '1', { sets: 3 });

    const result = await repo.pushPending(USER);

    expect(result).toEqual({ sent: 4, refused: 1, deleted: 0 });
    expect(calls.filter((call) => call.table === 'workout_sets').flatMap((call) => call.ids)).toEqual([
      's1-0000',
      's1-0002',
    ]);
    expect(
      db
        .select()
        .from(workoutSets)
        .where(eq(workoutSets.dirty, true))
        .all()
        .map((row) => row.id),
    ).toEqual(['s1-0001']);
  });

  it('stops when offline, leaving everything marked for the next run', async () => {
    const { api } = fakeApi({ fail: () => new AppError('Network', 'offline') });
    const { db, repo } = await setup(api);
    addWorkout(db, '1');

    await expect(repo.pushPending(USER)).rejects.toMatchObject({ code: 'Network' });
    expect(dirtyCount(db)).toBe(3);
  });

  it('keeps a row marked when it was edited while its page was on the way', async () => {
    const { db, repo } = await setup({
      async upsert(table) {
        if (table === 'workouts')
          db.update(workouts).set({ name: 'Renamed' }).where(eq(workouts.id, 'w1')).run();
      },
      async markDeleted() {},
    });
    addWorkout(db, '1');

    await repo.pushPending(USER);

    expect(db.select().from(workouts).get()).toMatchObject({ name: 'Renamed', dirty: true });
  });

  it('sends a deleted workout as one soft delete per table, then forgets the tombstones', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1', { sets: 2 });
    await repo.pushPending(USER);
    calls.length = 0;

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();
    const result = await repo.pushPending(USER);

    expect(result.deleted).toBe(4);
    expect(calls.map((call) => `${call.kind} ${call.table}:${call.ids.join(',')}`).sort()).toEqual([
      'delete workout_exercises:we1',
      'delete workout_sets:s1-0000,s1-0001',
      'delete workouts:w1',
    ]);
    expect(new Set(calls.map((call) => call.deletedAt)).size).toBe(1);
    expect(db.select().from(syncTombstones).all()).toHaveLength(0);
  });

  it('sends a big deletion in chunks small enough for a URL', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1', { sets: DELETE_CHUNK * 2 + 5 });
    await repo.pushPending(USER);
    calls.length = 0;

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();
    const result = await repo.pushPending(USER);

    const setDeletes = calls.filter((call) => call.kind === 'delete' && call.table === 'workout_sets');
    expect(setDeletes.map((call) => call.ids.length)).toEqual([DELETE_CHUNK, DELETE_CHUNK, 5]);
    expect(result.deleted).toBe(DELETE_CHUNK * 2 + 5 + 2);
    expect(db.select().from(syncTombstones).all()).toHaveLength(0);
  });

  it('runs once at a time: a second call joins the run under way', async () => {
    const { api, calls } = fakeApi();
    const { db, repo } = await setup(api);
    addWorkout(db, '1');

    const [first, second] = await Promise.all([repo.pushPending(USER), repo.pushPending(USER)]);

    expect(first).toBe(second);
    expect(calls).toHaveLength(3);
  });
});
