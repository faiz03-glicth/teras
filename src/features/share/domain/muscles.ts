import type { Muscle } from '@/core/db/schema';
import type { Highlight } from '@/features/exercises/domain/bodyMap';
import {
  GROUP_OF_MUSCLE,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/features/muscles/domain/muscleGroups';
import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';

/**
 * PURE: the muscles one workout worked, for the body figure. A muscle a completed set moved as the
 * main mover is `primary`; one that only helped is `secondary`, and never also primary. `rows` may hold
 * other workouts (a day's, a week's): only this workout's are read.
 */
export function musclesWorked(rows: readonly MuscleSetRow[], workoutId: string): Highlight {
  const done = rows.filter((row) => row.workoutId === workoutId && row.doneSets > 0);
  const primary = new Set<Muscle>(done.map((row) => row.primaryMuscle));
  const secondary = new Set<Muscle>(
    done.flatMap((row) => row.secondaryMuscles).filter((muscle) => !primary.has(muscle)),
  );
  return { primary: [...primary], secondary: [...secondary] };
}

/** PURE: the muscle groups the main movers belong to, in the order the muscle cards list them. */
export function workedGroups(highlight: Highlight): MuscleGroup[] {
  const groups = new Set(highlight.primary.map((muscle) => GROUP_OF_MUSCLE[muscle]));
  return MUSCLE_GROUPS.filter((group) => groups.has(group));
}

/** PURE: those groups as words: "Chest, Shoulders, Triceps". */
export function workedGroupsText(highlight: Highlight): string {
  return workedGroups(highlight)
    .map((group) => MUSCLE_GROUP_LABELS[group])
    .join(', ');
}
