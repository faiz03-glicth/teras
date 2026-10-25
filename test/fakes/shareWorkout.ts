import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** A set row, with the fields a test does not care about filled in. */
export const setRow = (id: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id,
  position: 0,
  weightKg: null,
  reps: null,
  seconds: null,
  status: 'done',
  setType: 'normal',
  rpe: null,
  note: null,
  ...over,
});

export const exerciseRow = (
  exerciseId: string,
  name: string,
  type: WorkoutExercise['type'],
  sets: WorkoutSet[],
): WorkoutExercise => ({ id: `we-${exerciseId}`, exerciseId, name, type, restSeconds: 90, sets });

/**
 * Push Day, Friday 2 October 2026, 18:20 to 19:22 (62 min), bodyweight 70 kg:
 * - Bench Press: a warm-up, 60 × 8 and 62.5 × 6 done, one more set left unticked;
 * - Pull-up (bodyweight): 12 reps, then 8 reps with 10 kg added;
 * - Plank (timed): 45 s and 75 s;
 * - Lateral Raise: three sets of 10 × 12.
 * 10 completed sets, 3,095 kg of volume.
 */
export const pushDay = (over: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  name: 'Push Day',
  routineId: 'push',
  date: '2026-10-02' as ISODate,
  startedAt: new Date(2026, 9, 2, 18, 20).toISOString(),
  endedAt: new Date(2026, 9, 2, 19, 22).toISOString(),
  bodyweightKg: 70,
  exercises: [
    exerciseRow('bench-press-barbell', 'Bench Press (Barbell)', 'weighted', [
      setRow('s1', { weightKg: 40, reps: 10, setType: 'warmup' }),
      setRow('s2', { weightKg: 60, reps: 8 }),
      setRow('s3', { weightKg: 62.5, reps: 6 }),
      setRow('s4', { weightKg: 62.5, reps: 6, status: 'pending' }),
    ]),
    exerciseRow('pull-up', 'Pull-up', 'bodyweight', [
      setRow('s5', { reps: 12 }),
      setRow('s6', { reps: 8, weightKg: 10 }),
    ]),
    exerciseRow('plank', 'Plank', 'timed', [setRow('s7', { seconds: 45 }), setRow('s8', { seconds: 75 })]),
    exerciseRow('lateral-raise-dumbbell', 'Lateral Raise', 'weighted', [
      setRow('s9', { weightKg: 10, reps: 12 }),
      setRow('s10', { weightKg: 10, reps: 12 }),
      setRow('s11', { weightKg: 10, reps: 12 }),
    ]),
  ],
  ...over,
});
