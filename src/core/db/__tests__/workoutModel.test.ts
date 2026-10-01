import { eq } from 'drizzle-orm';

import {
  EQUIPMENT,
  EXERCISE_TYPES,
  exercises,
  MUSCLES,
  routineExercises,
  routines,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

import { createTestDatabase } from '@test/db/createTestDatabase';

const NOW = '2026-09-30T10:00:00.000Z';
const stamps = { createdAt: NOW, updatedAt: NOW };

describe('workout data model', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  it('seeds the built-in exercise library with valid values', () => {
    const rows = db.select().from(exercises).all();

    expect(rows).toHaveLength(104);
    for (const row of rows) {
      expect(EQUIPMENT).toContain(row.equipment);
      expect(MUSCLES).toContain(row.primaryMuscle);
      expect(EXERCISE_TYPES).toContain(row.type);
      expect(row.isCustom).toBe(false);
      for (const muscle of row.secondaryMuscles) expect(MUSCLES).toContain(muscle);
    }
    expect(rows.find((row) => row.id === 'bench-press-barbell')).toMatchObject({
      name: 'Bench Press (Barbell)',
      primaryMuscle: 'chest',
      secondaryMuscles: ['triceps', 'shoulders'],
      type: 'weighted',
      isCompound: true,
    });
  });

  it('seeds the three starter routines, with seconds instead of reps for timed exercises', () => {
    expect(
      db
        .select()
        .from(routines)
        .orderBy(routines.position)
        .all()
        .map((row) => row.name),
    ).toEqual(['Push Day', 'Pull Day', 'Leg Day']);

    const items = db.select().from(routineExercises).all();
    expect(items).toHaveLength(16);
    expect(items.find((row) => row.exerciseId === 'plank')).toMatchObject({
      targetSets: 3,
      targetReps: null,
      targetSeconds: 45,
      startWeightKg: null,
    });
    expect(items.find((row) => row.exerciseId === 'bench-press-barbell')).toMatchObject({
      routineId: 'push',
      targetSets: 4,
      targetReps: 8,
      startWeightKg: 60,
    });
  });

  it('stores a workout with its sets, and deleting the workout removes them', () => {
    db.insert(workouts)
      .values({ id: 'w1', ...stamps, name: 'Push Day', date: '2026-09-30', startedAt: NOW, bodyweightKg: 70 })
      .run();
    db.insert(workoutExercises)
      .values({
        id: 'we1',
        ...stamps,
        workoutId: 'w1',
        exerciseId: 'bench-press-barbell',
        position: 0,
        restSeconds: 90,
      })
      .run();
    db.insert(workoutSets)
      .values({ id: 's1', ...stamps, workoutExerciseId: 'we1', position: 0, weightKg: 60, reps: 8, rpe: 8.5 })
      .run();

    expect(db.select().from(workoutSets).get()).toMatchObject({
      status: 'pending',
      setType: 'normal',
      rpe: 8.5,
      note: null,
    });

    db.delete(workouts).where(eq(workouts.id, 'w1')).run();

    expect(db.select().from(workoutExercises).all()).toHaveLength(0);
    expect(db.select().from(workoutSets).all()).toHaveLength(0);
  });

  it('refuses a workout exercise that points at an unknown exercise', () => {
    db.insert(workouts)
      .values({ id: 'w1', ...stamps, name: 'Workout', date: '2026-09-30', startedAt: NOW, bodyweightKg: 70 })
      .run();

    expect(() =>
      db
        .insert(workoutExercises)
        .values({ id: 'we1', ...stamps, workoutId: 'w1', exerciseId: 'nope', position: 0, restSeconds: 90 })
        .run(),
    ).toThrow();
  });
});
