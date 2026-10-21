import fs from 'fs';
import os from 'os';
import path from 'path';

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import initSqlJs from 'sql.js';

import * as schema from '@/core/db/schema';
import {
  exercises,
  routines,
  syncState,
  syncTombstones,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

import { createTestDatabase } from '@test/db/createTestDatabase';

const USER = '00000000-0000-0000-0000-0000000000a1';
const T0 = '2026-10-20T10:00:00.000Z';
const T1 = '2026-10-20T11:00:00.000Z';
const FUTURE = '2099-01-01T00:00:00.000Z';
const stamps = { createdAt: T0, updatedAt: T0 };

function addWorkout(db: AppDatabase, userId: string | null = USER, key = '1') {
  db.insert(workouts)
    .values({
      id: `w${key}`,
      userId,
      ...stamps,
      name: 'Push Day',
      date: '2026-10-20',
      startedAt: T0,
      bodyweightKg: 70,
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
      restSeconds: 90,
    })
    .run();
  db.insert(workoutSets)
    .values({
      id: `s${key}`,
      userId,
      ...stamps,
      workoutExerciseId: `we${key}`,
      position: 0,
      weightKg: 60,
      reps: 8,
    })
    .run();
}

const workout = (db: AppDatabase) => db.select().from(workouts).where(eq(workouts.id, 'w1')).get();
const setApplying = (db: AppDatabase, applying: boolean) =>
  db.update(syncState).set({ applying }).where(eq(syncState.id, 1)).run();

describe('sync tracking (migration 0007)', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  it('marks every new row to be sent, a running workout too (the push skips it until it ends)', () => {
    addWorkout(db);

    expect(workout(db)).toMatchObject({ dirty: true, updatedAt: T0 });
    expect(db.select().from(workoutExercises).get()?.dirty).toBe(true);
    expect(db.select().from(workoutSets).get()?.dirty).toBe(true);
  });

  it('marks an edited row and moves its updated_at past the stored one when the edit left it alone', () => {
    addWorkout(db);
    setApplying(db, true);
    db.update(workouts).set({ dirty: false }).where(eq(workouts.id, 'w1')).run();
    setApplying(db, false);

    db.update(workouts).set({ name: 'Renamed' }).where(eq(workouts.id, 'w1')).run();

    const row = workout(db);
    expect(row).toMatchObject({ name: 'Renamed', dirty: true });
    expect(row!.updatedAt > T0).toBe(true);
    expect(row!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('keeps an updated_at the edit moved forward itself', () => {
    addWorkout(db);

    db.update(workouts).set({ endedAt: T1, updatedAt: T1 }).where(eq(workouts.id, 'w1')).run();

    expect(workout(db)).toMatchObject({ updatedAt: T1, dirty: true });
  });

  it('still moves past a stored updated_at that is ahead of this phone’s clock', () => {
    addWorkout(db);
    db.update(workouts).set({ updatedAt: FUTURE }).where(eq(workouts.id, 'w1')).run();

    db.update(workouts).set({ name: 'Renamed' }).where(eq(workouts.id, 'w1')).run();

    expect(workout(db)!.updatedAt > FUTURE).toBe(true);
  });

  it('leaves dirty, updated_at and tombstones alone while the sync engine is applying', () => {
    setApplying(db, true);
    addWorkout(db);
    db.update(workouts).set({ name: 'From the server' }).where(eq(workouts.id, 'w1')).run();
    expect(workout(db)).toMatchObject({ dirty: false, updatedAt: T0 });

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();
    expect(db.select().from(syncTombstones).all()).toHaveLength(0);
  });

  it('leaves a tombstone for a deleted workout and each exercise and set the delete cascaded to', () => {
    addWorkout(db);

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();

    const tombstones = db.select().from(syncTombstones).all();
    expect(tombstones.map((row) => `${row.tableName}/${row.id}`).sort()).toEqual([
      'workout_exercises/we1',
      'workout_sets/s1',
      'workouts/w1',
    ]);
    for (const row of tombstones) {
      expect(row.userId).toBe(USER);
      expect(row.deletedAt > T0).toBe(true);
    }
  });

  it('drops the tombstone when a row is written again under the same id', () => {
    addWorkout(db);
    db.delete(workouts).where(eq(workouts.id, 'w1')).run();

    addWorkout(db);

    expect(db.select().from(syncTombstones).all()).toHaveLength(0);
    expect(workout(db)?.dirty).toBe(true);
  });

  it('leaves no tombstone for a guest’s rows, which have no owner yet', () => {
    addWorkout(db, null);

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();

    expect(db.select().from(syncTombstones).all()).toHaveLength(0);
  });

  it('never sends the built-in exercises or the starter routines', () => {
    const builtIn = db.select().from(exercises).where(eq(exercises.id, 'bench-press-barbell')).get();
    expect(builtIn).toMatchObject({ userId: null, isCustom: false, dirty: false });
    expect(
      db
        .select()
        .from(routines)
        .all()
        .every((row) => row.userId === null && !row.dirty),
    ).toBe(true);
  });

  it('marks the rows a person already owned when the phone updates to it: the first upload', async () => {
    // A database migrated up to 0006, as phones were before this release.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teras-migrations-'));
    const source = path.join(__dirname, '../migrations');
    fs.cpSync(source, dir, { recursive: true });
    const journalPath = path.join(dir, 'meta/_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    fs.writeFileSync(
      journalPath,
      JSON.stringify({
        ...journal,
        entries: journal.entries.filter((entry: { idx: number }) => entry.idx < 7),
      }),
    );
    const SQL = await initSqlJs();
    const old = drizzle(new SQL.Database(), { schema });
    old.run(sql`PRAGMA foreign_keys = ON;`);
    migrate(old, { migrationsFolder: dir });
    addWorkout(old);
    addWorkout(old, null, 'guest');
    expect(
      old
        .select()
        .from(workouts)
        .all()
        .every((row) => !row.dirty),
    ).toBe(true);

    migrate(old, { migrationsFolder: source });

    const rows = old.select().from(workouts).all();
    expect(rows.find((row) => row.userId === USER)).toMatchObject({ dirty: true, updatedAt: T0 });
    expect(
      old
        .select()
        .from(workoutSets)
        .all()
        .filter((row) => row.dirty),
    ).toHaveLength(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
