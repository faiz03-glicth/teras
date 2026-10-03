/** "1 set", "4 sets": the number with its word, so nothing ever reads "1 sets". */
export const countSets = (count: number): string => `${count} set${count === 1 ? '' : 's'}`;

/** "1 workout", "8 workouts". */
export const countWorkouts = (count: number): string => `${count} workout${count === 1 ? '' : 's'}`;

/** How many exercises a feed card lists before it says how many more there are. */
const PREVIEW_EXERCISES = 3;

export interface ExercisePreview {
  /** "4 sets" · "Bench Press (Barbell)", for the first few exercises. */
  lines: { sets: string; name: string }[];
  /** "See 2 more exercises", or null when they all fit. */
  more: string | null;
}

/** PURE: a workout's exercises as a feed card previews them: scannable at a glance, never a paragraph. */
export function exercisePreview(exercises: readonly { name: string; sets: number }[]): ExercisePreview {
  const hidden = exercises.length - PREVIEW_EXERCISES;
  return {
    lines: exercises
      .slice(0, PREVIEW_EXERCISES)
      .map((exercise) => ({ sets: countSets(exercise.sets), name: exercise.name })),
    more: hidden > 0 ? `See ${hidden} more exercise${hidden === 1 ? '' : 's'}` : null,
  };
}
