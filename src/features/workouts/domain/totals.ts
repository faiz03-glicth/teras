import type { ExerciseType, SetStatus } from '@/core/db/schema';
import type { DayTotals } from '@/features/workoutDays/domain/WorkoutDay';

/** A set, reduced to what volume needs: how it is measured, and what was actually done. */
export interface SetForVolume {
  status: SetStatus;
  /** The lifted weight for a weighted set, the ADDED weight for a bodyweight one. */
  weightKg: number | null;
  reps: number | null;
  type: ExerciseType;
}

/** One session's sets, against the bodyweight it started with. */
export interface WorkoutForVolume {
  bodyweightKg: number;
  sets: readonly SetForVolume[];
}

/** PURE: what one completed set adds to the day's volume, in kilograms. */
function setVolumeKg(set: SetForVolume, bodyweightKg: number): number {
  // A timed set is work, but not weight × reps: it counts as a set and adds nothing.
  if (set.type === 'timed') return 0;
  const reps = set.reps ?? 0;
  const load = set.type === 'bodyweight' ? bodyweightKg + (set.weightKg ?? 0) : (set.weightKg ?? 0);
  return reps * load;
}

/**
 * PURE: what a day's workouts add up to, for the heat level and the Streak summary.
 * Only completed sets count, so an abandoned workout contributes nothing and is not a workout.
 * Each session uses the bodyweight it started with, which is why logging a new weight never changes
 * a past day.
 */
export function dayTotals(workouts: readonly WorkoutForVolume[]): DayTotals {
  let volumeKg = 0;
  let sets = 0;
  let counted = 0;

  for (const workout of workouts) {
    const done = workout.sets.filter((set) => set.status === 'done');
    if (done.length === 0) continue;
    counted += 1;
    sets += done.length;
    for (const set of done) volumeKg += setVolumeKg(set, workout.bodyweightKg);
  }

  return { volumeKg, sets, workouts: counted };
}

/** A workout as it is stored: each exercise says how it is measured, its sets what was done. */
export interface WorkoutWithExercises {
  bodyweightKg: number;
  exercises: readonly { type: ExerciseType; sets: readonly Omit<SetForVolume, 'type'>[] }[];
}

/**
 * PURE: one workout's totals, by exactly the rule its day is recorded with (dayTotals), so a session's
 * volume and the day it lit can never disagree.
 */
export function workoutTotals(workout: WorkoutWithExercises): DayTotals {
  const sets = workout.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      status: set.status,
      weightKg: set.weightKg,
      reps: set.reps,
      type: exercise.type,
    })),
  );
  return dayTotals([{ bodyweightKg: workout.bodyweightKg, sets }]);
}
