import { eq } from 'drizzle-orm';

import {
  bodyweightLogs,
  exerciseFavourites,
  exercises,
  routineExercises,
  routines,
  syncTombstones,
  workoutDays,
  workoutExercises,
  workouts,
  workoutSets,
  type DetailTable,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import { createWorkoutDayDao } from '@/features/workoutDays/data/local/workoutDayDao';

import { createTestDatabase } from '@test/db/createTestDatabase';

import { RemoteDetailSyncRepository } from '../DetailSyncRepository';
import { createDetailSyncDao, type DetailRow, type PulledRow } from '../local/detailSyncDao';
import type { DetailApi } from '../remote/detailApi';

const USER = '00000000-0000-0000-0000-0000000000a1';
const T0 = '2026-10-20T10:00:00.000Z';
const T1 = '2026-10-20T11:40:00.000Z';
const stamps = { createdAt: T0, updatedAt: T0 };

/**
 * A stand-in for teras-detail shared by two phones: the newest updated_at wins, a deletion always lands,
 * and the pull hands rows back the way Postgres's to_jsonb writes them (times as "+00:00").
 */
function fakeServer() {
  const tables = new Map<DetailTable, Map<string, { row: DetailRow; syncedAt: string }>>();
  let clock = 0;
  const stamp = () => `2026-10-21 00:00:${String(clock++).padStart(2, '0')}.123456+00`;
  const table = (name: DetailTable) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  const asPostgres = (value: unknown) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)
      ? value.replace('.000Z', '+00:00')
      : value;
  const pulls: { table: DetailTable; since: string | null }[] = [];

  const api: DetailApi = {
    async upsert(name, rows) {
      for (const row of rows) {
        const stored = table(name).get(String(row.id));
        if (stored && String(stored.row.updated_at) >= String(row.updated_at)) continue;
        table(name).set(String(row.id), { row: { ...row }, syncedAt: stamp() });
      }
    },
    async markDeleted(name, _userId, ids, deletedAt) {
      for (const id of ids) {
        const stored = table(name).get(id);
        if (stored)
          table(name).set(id, {
            row: { ...stored.row, deleted_at: deletedAt, updated_at: deletedAt },
            syncedAt: stamp(),
          });
      }
    },
    async pull(name, since, sinceId, page) {
      pulls.push({ table: name, since });
      return [...table(name).entries()]
        .map(([id, { row, syncedAt }]): PulledRow => {
          const { user_id: _owner, ...data } = row;
          return {
            id,
            syncedAt,
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, asPostgres(v)])),
          };
        })
        .filter(
          (row) =>
            since === null || row.syncedAt > since || (row.syncedAt === since && row.id > (sinceId ?? '')),
        )
        .sort((a, b) =>
          a.syncedAt === b.syncedAt ? (a.id < b.id ? -1 : 1) : a.syncedAt < b.syncedAt ? -1 : 1,
        )
        .slice(0, page);
    },
  };
  return { api, tables, pulls };
}

async function phone(api: DetailApi) {
  const db = await createTestDatabase();
  return { db, repo: new RemoteDetailSyncRepository({ dao: createDetailSyncDao(db), api }) };
}

/** A person's history on one phone: a custom exercise, a routine using it, a finished workout, a weigh-in. */
function logHistory(db: AppDatabase) {
  db.insert(exercises)
    .values({
      id: 'c1',
      userId: USER,
      ...stamps,
      name: 'Landmine Press',
      equipment: 'barbell',
      primaryMuscle: 'shoulders',
      secondaryMuscles: ['triceps'],
      type: 'weighted',
      isCompound: true,
      isCustom: true,
    })
    .run();
  db.insert(routines)
    .values({ id: 'r1', userId: USER, ...stamps, name: 'Mine', position: 3 })
    .run();
  db.insert(routineExercises)
    .values({
      id: 're1',
      userId: USER,
      ...stamps,
      routineId: 'r1',
      exerciseId: 'c1',
      position: 0,
      targetSets: 3,
      targetReps: 8,
    })
    .run();
  db.insert(workouts)
    .values({
      id: 'w1',
      userId: USER,
      ...stamps,
      name: 'Mine',
      routineId: 'r1',
      date: '2023-07-04',
      startedAt: T0,
      endedAt: T1,
      bodyweightKg: 70.5,
    })
    .run();
  db.insert(workoutExercises)
    .values({
      id: 'we1',
      userId: USER,
      ...stamps,
      workoutId: 'w1',
      exerciseId: 'c1',
      position: 0,
      restSeconds: 120,
    })
    .run();
  db.insert(workoutSets)
    .values({
      id: 's1',
      userId: USER,
      ...stamps,
      workoutExerciseId: 'we1',
      position: 0,
      weightKg: 42.5,
      reps: 8,
      status: 'done',
      rpe: 8.5,
    })
    .run();
  db.insert(bodyweightLogs)
    .values({ id: 'b1', userId: USER, ...stamps, date: '2023-07-04', weightKg: 70.5 })
    .run();
  db.insert(exerciseFavourites)
    .values({ id: 'f1', userId: USER, ...stamps, exerciseId: 'bench-press-barbell' })
    .run();
}

describe('bringing workout detail onto another phone', () => {
  it('fills an empty phone with the history another phone sent, exactly, and marks nothing to send back', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);

    await android.repo.sync(USER);
    const result = await iphone.repo.sync(USER);

    expect(result.pull).toMatchObject({ changed: 8, skipped: 0, earliestDate: '2023-07-04' });
    expect(iphone.db.select().from(workouts).get()).toEqual(android.db.select().from(workouts).get());
    expect(iphone.db.select().from(workoutSets).get()).toMatchObject({
      weightKg: 42.5,
      reps: 8,
      rpe: 8.5,
      status: 'done',
      dirty: false,
    });
    expect(iphone.db.select().from(exercises).where(eq(exercises.id, 'c1')).get()).toMatchObject({
      secondaryMuscles: ['triceps'],
      isCompound: true,
      isCustom: true,
      dirty: false,
    });
    expect(
      iphone.db.select().from(routineExercises).where(eq(routineExercises.id, 're1')).get()?.routineId,
    ).toBe('r1');
    expect(iphone.db.select().from(bodyweightLogs).get()?.weightKg).toBe(70.5);
    expect(iphone.db.select().from(exerciseFavourites).get()?.exerciseId).toBe('bench-press-barbell');
    expect(await iphone.repo.pushPending(USER)).toEqual({ sent: 0, refused: 0, deleted: 0 });
  });

  it('changes nothing when a phone pulls back what it sent itself', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    logHistory(android.db);

    const result = await android.repo.sync(USER);

    expect(result.pull.changed).toBe(0);
    expect(android.db.select().from(workouts).get()?.dirty).toBe(false);
  });

  it('removes a workout deleted on the other phone, with its exercises and sets, leaving no tombstones', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);
    await android.repo.sync(USER);
    await iphone.repo.sync(USER);

    android.db.delete(workouts).where(eq(workouts.id, 'w1')).run();
    await android.repo.sync(USER);
    await iphone.repo.sync(USER);

    expect(iphone.db.select().from(workouts).all()).toHaveLength(0);
    expect(iphone.db.select().from(workoutSets).all()).toHaveLength(0);
    expect(iphone.db.select().from(syncTombstones).all()).toHaveLength(0);
  });

  it('brings in an edit made on the other phone, and keeps this phone’s own unsent edit', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);
    await android.repo.sync(USER);
    await iphone.repo.sync(USER);

    android.db.update(workouts).set({ name: 'Renamed on Android' }).where(eq(workouts.id, 'w1')).run();
    await android.repo.sync(USER);
    iphone.db.update(workoutSets).set({ reps: 9 }).where(eq(workoutSets.id, 's1')).run();
    await iphone.repo.pullChanges(USER);

    expect(iphone.db.select().from(workouts).get()?.name).toBe('Renamed on Android');
    expect(iphone.db.select().from(workoutSets).get()).toMatchObject({ reps: 9, dirty: true });
  });

  it('asks the server only for what came after its bookmark', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);
    await android.repo.sync(USER);
    await iphone.repo.pullChanges(USER);
    server.pulls.length = 0;

    const again = await iphone.repo.pullChanges(USER);

    expect(again.changed).toBe(0);
    expect(server.pulls.find((call) => call.table === 'workouts')?.since).toMatch(/^2026-10-21/);
  });

  it('leaves out a row with a value it can’t store, and takes the rest', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);
    await android.repo.sync(USER);
    const stored = server.tables.get('workout_sets')!.get('s1')!;
    stored.row = { ...stored.row, reps: 'eight' };

    const result = await iphone.repo.pullChanges(USER);

    expect(result.skipped).toBe(1);
    expect(iphone.db.select().from(workoutSets).all()).toHaveLength(0);
    expect(iphone.db.select().from(workouts).all()).toHaveLength(1);
  });

  it('keeps one favourite per exercise when both phones favourited the same one', async () => {
    const server = fakeServer();
    const android = await phone(server.api);
    const iphone = await phone(server.api);
    logHistory(android.db);
    await android.repo.sync(USER);
    iphone.db
      .insert(exerciseFavourites)
      .values({ id: 'f-iphone', userId: USER, ...stamps, exerciseId: 'bench-press-barbell' })
      .run();
    await iphone.repo.sync(USER);
    await android.repo.sync(USER);
    await iphone.repo.sync(USER);

    for (const db of [android.db, iphone.db]) {
      expect(
        db
          .select()
          .from(exerciseFavourites)
          .where(eq(exerciseFavourites.exerciseId, 'bench-press-barbell'))
          .all(),
      ).toHaveLength(1);
    }
  });
});

describe('storing day summaries from the server', () => {
  const day = { date: '2023-07-04', volumeKg: 1200, sets: 12, workouts: 1, level: 3 };
  const stamp = { uuid: () => 'day-1', now: T1 };

  it('adds the days a new phone lacks, unmarked, and leaves unchanged days alone', async () => {
    const db = await createTestDatabase();
    const dao = createWorkoutDayDao(db);

    expect(await dao.saveFromServer(USER, [day], stamp)).toBe(1);
    expect(await dao.saveFromServer(USER, [day], stamp)).toBe(0);
    expect(db.select().from(workoutDays).get()).toMatchObject({ ...day, userId: USER, dirty: false });
  });

  it('keeps a day this phone still has to send', async () => {
    const db = await createTestDatabase();
    const dao = createWorkoutDayDao(db);
    await dao.save({ id: 'mine', userId: USER, ...stamps, ...day, level: 1, dirty: true });

    expect(await dao.saveFromServer(USER, [day], stamp)).toBe(0);
    expect(db.select().from(workoutDays).get()).toMatchObject({ level: 1, dirty: true });
  });
});
