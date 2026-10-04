import { MUSCLES, type Equipment, type ExerciseRow, type Muscle } from '@/core/db/schema';

import { MUSCLE_LABELS } from './labels';
import { searchExercises } from './search';

export interface BrowserSections {
  /** Favourites and recent lead the list, but only before anything is searched for. */
  favourites: ExerciseRow[];
  recent: ExerciseRow[];
  /** Every exercise that matches, in library order. */
  matches: ExerciseRow[];
  /** Something narrows the list, so it is a count of matches rather than "All exercises". */
  filtered: boolean;
}

export interface BrowserFilters {
  query: string;
  favouriteIds: readonly string[];
  recentIds: readonly string[];
  /** Only exercises working this muscle, mainly or as a secondary one. */
  muscle?: Muscle | null;
  equipment?: Equipment | null;
}

/** PURE: the exercises working a muscle, those it works most (its primary) before the rest. */
function working(rows: readonly ExerciseRow[], muscle: Muscle): ExerciseRow[] {
  return [
    ...rows.filter((row) => row.primaryMuscle === muscle),
    ...rows.filter((row) => row.primaryMuscle !== muscle && row.secondaryMuscles.includes(muscle)),
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
  const filtered = query.trim() !== '' || muscle !== null || equipment !== null;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ofEquipment = equipment === null ? rows : rows.filter((row) => row.equipment === equipment);
  const candidates = muscle === null ? ofEquipment : working(ofEquipment, muscle);
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
    matches: searchExercises(candidates, query),
    filtered,
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
 * library's muscle order, the chosen muscle (if any) first; each keeps the order it was given (library
 * order, or best match first while searching).
 */
export function groupByMuscle(rows: readonly ExerciseRow[], lead: Muscle | null): MuscleGroup[] {
  const order = lead === null ? MUSCLES : [lead, ...MUSCLES.filter((muscle) => muscle !== lead)];
  return order.flatMap((muscle) => {
    const mine = rows.filter((row) => row.primaryMuscle === muscle);
    return mine.length > 0 ? [{ muscle, rows: mine }] : [];
  });
}
