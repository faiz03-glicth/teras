import { MUSCLES, type Equipment, type ExerciseRow, type Muscle } from '@/core/db/schema';

import { MUSCLE_LABELS } from './labels';
import { searchExercises } from './search';

export interface BrowserSections {
  /** Favourites and recent lead the list, but only before anything is searched for. */
  favourites: ExerciseRow[];
  recent: ExerciseRow[];
  /**
   * Every exercise that matches: the best match first while searching, otherwise in library order
   * (familiar exercises before their variations). A chosen muscle's own exercises come first either way.
   */
  matches: ExerciseRow[];
  /** Something narrows the list, so it is a count of matches rather than "All exercises". */
  filtered: boolean;
  /** Something is typed, so the matches are in best-match order. */
  searching: boolean;
}

export interface BrowserFilters {
  query: string;
  favouriteIds: readonly string[];
  recentIds: readonly string[];
  /** Only exercises working this muscle, mainly or as a secondary one. */
  muscle?: Muscle | null;
  equipment?: Equipment | null;
}

/**
 * PURE: the exercises working a muscle that match the query: those it works most (its primary) first,
 * then the rest, each part best match (or library order) first.
 */
function working(rows: readonly ExerciseRow[], muscle: Muscle, query: string): ExerciseRow[] {
  return [
    ...searchExercises(
      rows.filter((row) => row.primaryMuscle === muscle),
      query,
    ),
    ...searchExercises(
      rows.filter((row) => row.primaryMuscle !== muscle && row.secondaryMuscles.includes(muscle)),
      query,
    ),
  ];
}

/**
 * PURE: the exercise browser's sections, as the prototype lays them out: Favourites, Recent, then all
 * exercises, or only the matches while searching or filtering by muscle or equipment. A favourite or
 * recent exercise no longer in the library (a deleted custom one) is passed over.
 */
export function browserSections(
  rows: readonly ExerciseRow[],
  { query, favouriteIds, recentIds, muscle = null, equipment = null }: BrowserFilters,
): BrowserSections {
  const searching = query.trim() !== '';
  const filtered = searching || muscle !== null || equipment !== null;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ofEquipment = equipment === null ? rows : rows.filter((row) => row.equipment === equipment);
  const pick = (ids: readonly string[]) =>
    filtered
      ? []
      : ids.flatMap((id) => {
          const row = byId.get(id);
          return row ? [row] : [];
        });
  return {
    favourites: pick(favouriteIds),
    recent: pick(recentIds),
    matches: muscle === null ? searchExercises(ofEquipment, query) : working(ofEquipment, muscle, query),
    filtered,
    searching,
  };
}

/** PURE: the two letters that mark an exercise's row, from its primary muscle: "CH" for chest. */
export function muscleBadge(muscle: Muscle): string {
  return MUSCLE_LABELS[muscle].slice(0, 2).toUpperCase();
}

export interface MuscleGroup {
  muscle: Muscle;
  rows: ExerciseRow[];
}

/**
 * PURE: exercises grouped by their primary muscle, never repeated for a secondary one. Groups follow the
 * library's muscle order or, `byBestMatch` (while searching), the order of each group's best match; the
 * chosen muscle (if any) leads either way. Each group keeps the order it was given.
 */
export function groupByMuscle(
  rows: readonly ExerciseRow[],
  lead: Muscle | null,
  byBestMatch = false,
): MuscleGroup[] {
  const muscles: readonly Muscle[] = byBestMatch
    ? [...new Set(rows.map((row) => row.primaryMuscle))]
    : MUSCLES;
  const order = lead === null ? muscles : [lead, ...muscles.filter((muscle) => muscle !== lead)];
  return order.flatMap((muscle) => {
    const mine = rows.filter((row) => row.primaryMuscle === muscle);
    return mine.length > 0 ? [{ muscle, rows: mine }] : [];
  });
}
