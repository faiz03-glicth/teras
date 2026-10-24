import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';

/** Thursday 22 Oct 2026: this week began Monday 19 Oct, last week Monday 12 Oct. */
export const TODAY = '2026-10-22';

/** A primary muscle for each of the ten groups, in the groups' order. */
export const MUSCLE_OF_GROUP = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'calves',
  'hamstrings',
  'glutes',
  'lats',
] as const satisfies readonly MuscleSetRow['primaryMuscle'][];

/** A workout on `date` that works each of these primary muscles with `sets` completed sets. */
export const workout = (
  id: string,
  date: string,
  muscles: readonly MuscleSetRow['primaryMuscle'][],
  sets = 3,
): MuscleSetRow[] =>
  muscles.map((muscle) => ({
    workoutId: id,
    date,
    primaryMuscle: muscle,
    secondaryMuscles: [],
    doneSets: sets,
  }));

/** Every muscle group, once, in one workout. */
export const wholeBody = (id: string, date: string, sets = 3) => workout(id, date, MUSCLE_OF_GROUP, sets);
