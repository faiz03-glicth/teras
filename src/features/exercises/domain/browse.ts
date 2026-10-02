import type { ExerciseRow, Muscle } from '@/core/db/schema';

import { MUSCLE_LABELS } from './labels';
import { searchExercises } from './search';

/** How many exercises the full list shows at a time; "Show more" adds as many again. */
export const BROWSER_PAGE = 40;

export interface BrowserSections {
  /** Favourites and recent lead the list, but only before anything is searched for. */
  favourites: ExerciseRow[];
  recent: ExerciseRow[];
  /** Every exercise that matches, in library order. */
  matches: ExerciseRow[];
  /** Something narrows the list, so it is a count of matches rather than "All exercises". */
  filtered: boolean;
}

/**
 * PURE: the exercise browser's sections, as the prototype lays them out: Favourites, Recent, then all
 * exercises, or only the matches while searching. A favourite or recent exercise no longer in the
 * library (a deleted custom one) is passed over.
 */
export function browserSections(
  rows: readonly ExerciseRow[],
  {
    query,
    favouriteIds,
    recentIds,
  }: { query: string; favouriteIds: readonly string[]; recentIds: readonly string[] },
): BrowserSections {
  const filtered = query.trim() !== '';
  const byId = new Map(rows.map((row) => [row.id, row]));
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
    matches: searchExercises(rows, query),
    filtered,
  };
}

/** PURE: the two letters that mark an exercise's row, from its primary muscle: "CH" for chest. */
export function muscleBadge(muscle: Muscle): string {
  return MUSCLE_LABELS[muscle].slice(0, 2).toUpperCase();
}
