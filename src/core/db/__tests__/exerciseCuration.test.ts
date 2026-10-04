import path from 'path';

import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import * as schema from '@/core/db/schema';
import {
  exerciseFavourites,
  exercises,
  routineExercises,
  workoutExercises,
  workouts,
  type ExerciseRow,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import { CATALOGUE } from '@/features/exercises/domain/catalogue.generated';

const MIGRATIONS = readMigrationFiles({ migrationsFolder: path.join(__dirname, '../migrations') });
/** Migration 0005, the one scripts/exercise-dataset/build-curation.js writes. */
const CURATION = MIGRATIONS.findIndex((migration) =>
  migration.sql.some((statement) => statement.includes('build-curation.js')),
);
const CURATED_AT = '2026-10-04T00:00:00.000Z';
const BUILT_IN_AT = '2026-09-30T00:00:00.000Z';
const STAMP = '2026-10-01T00:00:00.000Z';
const stamps = { createdAt: STAMP, updatedAt: STAMP };

/**
 * The curation as a phone meets it: every migration before it, then what the person has done (`before`),
 * then the curation. Returns the exercises as they were before it and after.
 */
async function curate(before: (db: AppDatabase) => void = () => undefined) {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run('PRAGMA foreign_keys = ON;');
  const db = drizzle(database, { schema });
  const apply = (index: number) => {
    for (const statement of MIGRATIONS[index]?.sql ?? []) database.run(statement);
  };
  for (let index = 0; index < CURATION; index += 1) apply(index);
  before(db);
  const seeded = db.select().from(exercises).all();
  apply(CURATION);
  const curated = db.select().from(exercises).all();
  const byId = new Map(curated.map((row) => [row.id, row]));
  return { seeded, curated, get: (id: string) => byId.get(id) };
}

const builtIn = (rows: readonly ExerciseRow[]) => rows.filter((row) => row.createdAt === BUILT_IN_AT);

describe('migration 0005, the exercise curation', () => {
  it('is the migration after the open dataset', () => {
    expect(CURATION).toBe(5);
  });

  it('leaves exactly the curated library, never a name twice', async () => {
    const { curated } = await curate();
    const live = curated.filter((row) => row.deletedAt === null);
    const names = live.map((row) => row.name.toLowerCase());

    expect(live.map((row) => row.id).sort()).toEqual(Object.keys(CATALOGUE.exercises).sort());
    expect(new Set(names).size).toBe(names.length);
    // Hidden, not deleted: a dropped exercise keeps its row, so nothing pointing at it can break.
    expect(curated).toHaveLength(104 + 1123);
  });

  it('leaves the built-in exercises exactly as they were', async () => {
    const { seeded, curated } = await curate();

    expect(builtIn(curated)).toHaveLength(104);
    expect(builtIn(curated)).toEqual(builtIn(seeded));
  });

  it('fixes dataset names, and hides a near-duplicate of an exercise kept', async () => {
    const { get } = await curate();

    expect(get('air-bike')).toMatchObject({ name: 'Bicycle Crunch', deletedAt: null });
    expect(get('alternate-heel-touchers')).toMatchObject({ name: 'Heel Touch', deletedAt: null });
    // "45в° Calf Press (Machine)" is the calf press under a broken name.
    expect(get('45-calf-press-machine')).toMatchObject({ deletedAt: CURATED_AT });
    expect(get('calf-press-machine')).toMatchObject({ name: 'Calf Press (Machine)', deletedAt: null });
  });

  it("files a built-in's movement on other equipment under the built-in's main muscle", async () => {
    const { seeded, get } = await curate();

    expect(seeded.find((row) => row.id === 'squat-dumbbell')?.primaryMuscle).toBe('glutes');
    expect(get('squat-dumbbell')).toMatchObject({
      primaryMuscle: 'quads',
      secondaryMuscles: ['hamstrings', 'glutes', 'calves'],
    });
  });

  it('keeps a dropped exercise that a workout, a routine or a favourite uses', async () => {
    const inWorkout = 'plyo-squat-dumbbell';
    const inRoutine = 'biceps-curl-squat-dumbbell';
    const favourite = 'step-up-split-squat-dumbbell';
    const unused = await curate();
    for (const id of [inWorkout, inRoutine, favourite]) {
      expect(unused.get(id)).toMatchObject({ deletedAt: CURATED_AT });
    }

    const { get } = await curate((db) => {
      db.insert(workouts)
        .values({
          id: 'workout',
          userId: null,
          ...stamps,
          name: 'Workout',
          date: '2026-10-01',
          startedAt: STAMP,
          endedAt: STAMP,
          bodyweightKg: 70,
        })
        .run();
      db.insert(workoutExercises)
        .values({
          id: 'entry',
          userId: null,
          ...stamps,
          workoutId: 'workout',
          exerciseId: inWorkout,
          position: 0,
          restSeconds: 90,
        })
        .run();
      db.insert(routineExercises)
        .values({
          id: 'planned',
          userId: null,
          ...stamps,
          routineId: 'push',
          exerciseId: inRoutine,
          position: 9,
          targetSets: 3,
          targetReps: 10,
        })
        .run();
      db.insert(exerciseFavourites)
        .values({ id: 'liked', userId: null, ...stamps, exerciseId: favourite })
        .run();
    });

    for (const id of [inWorkout, inRoutine, favourite]) expect(get(id)).toMatchObject({ deletedAt: null });
  });

  it("never touches a person's own exercise, nor gives its name to a dataset one", async () => {
    const mine = {
      id: 'mine',
      userId: 'user-1',
      ...stamps,
      name: 'Heel Touch',
      equipment: 'bodyweight' as const,
      primaryMuscle: 'abs' as const,
      secondaryMuscles: [],
      type: 'bodyweight' as const,
      isCompound: false,
      isCustom: true,
    };

    const { get } = await curate((db) => {
      db.insert(exercises).values(mine).run();
    });

    expect(get('mine')).toMatchObject({ name: 'Heel Touch', updatedAt: STAMP, deletedAt: null });
    // "Alternate Heel Touchers" would become "Heel Touch", which is the person's: it keeps its own name.
    expect(get('alternate-heel-touchers')).toMatchObject({
      name: 'Alternate Heel Touchers',
      deletedAt: null,
    });
  });
});
