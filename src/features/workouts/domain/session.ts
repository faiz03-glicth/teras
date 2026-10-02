import type { ExerciseType, SetStatus } from '@/core/db/schema';
import { formatRest, formatWeight, type WeightUnit } from '@/features/training/domain/preferences';

/** A set as a finished workout keeps it: what was done, and whether it was ticked. */
export interface SessionSet {
  id: string;
  status: SetStatus;
  /** The lifted weight, or the ADDED weight for a bodyweight exercise. */
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

export interface SessionExercise<S extends SessionSet = SessionSet> {
  id: string;
  name: string;
  type: ExerciseType;
  sets: readonly S[];
}

/**
 * PURE: what a finished workout recorded: completed sets only, and only the exercises that have one.
 * Unticked sets are not part of the record (decision 19), so they never appear in its history.
 */
export function loggedExercises<S extends SessionSet, E extends SessionExercise<S>>(
  exercises: readonly E[],
): (E & { sets: S[] })[] {
  return exercises
    .map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.status === 'done') }))
    .filter((exercise) => exercise.sets.length > 0);
}

/**
 * PURE: one completed set as it reads: "60 kg × 8", "Bodyweight + 10 kg × 8", "Bodyweight × 12" or
 * "45 s". Weights are stored in kilograms and converted only here, for display.
 */
export function setLabel(
  set: Pick<SessionSet, 'weightKg' | 'reps' | 'seconds'>,
  type: ExerciseType,
  unit: WeightUnit,
): string {
  const reps = set.reps ?? 0;
  if (type === 'timed') return formatRest(set.seconds ?? 0);
  if (type === 'bodyweight') {
    const added = set.weightKg ?? 0;
    return added > 0 ? `Bodyweight + ${formatWeight(added, unit)} × ${reps}` : `Bodyweight × ${reps}`;
  }
  return `${formatWeight(set.weightKg ?? 0, unit)} × ${reps}`;
}
