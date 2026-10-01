import type { HeatLevel } from '@/features/heatmap/domain/grid';

import type { DayTotals } from './WorkoutDay';

/** A day is judged against the training days in the 90 days before it. */
export const HEAT_WINDOW_DAYS = 90;
/** With fewer earlier training days than this there is no history to judge against yet. */
export const MIN_TRAINING_DAYS = 5;

/** PURE: the value at fraction `p` (0–1) of an ascending list, interpolating between neighbours. */
export function quantile(ascending: readonly number[], p: number): number {
  const position = (ascending.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, ascending.length - 1);
  const low = ascending[lower] ?? 0;
  const high = ascending[upper] ?? low;
  return low + (position - lower) * (high - low);
}

/**
 * PURE: how dark a training day is, against the person's OWN recent history.
 * - no completed sets → 0 (No workout)
 * - completed sets but no volume (planks only, say) → 1 (Light): a day you trained is never empty
 * - fewer than five training days in the window → 2 (Moderate): nothing to compare with yet
 * - otherwise by quartile of the window's volumes: below Q1 → 1, below the median → 2, below Q3 → 3, else 4
 *
 * `windowVolumes` are the volumes of the training days in the 90 days BEFORE this day. The result is stored
 * with the day and only recalculated when that day's own sets change, so past days never repaint.
 */
export function heatLevel(
  totals: Pick<DayTotals, 'volumeKg' | 'sets'>,
  windowVolumes: readonly number[],
): HeatLevel {
  if (!(totals.sets > 0)) return 0;
  if (!(totals.volumeKg > 0)) return 1;
  if (windowVolumes.length < MIN_TRAINING_DAYS) return 2;
  const ascending = [...windowVolumes].sort((a, b) => a - b);
  if (totals.volumeKg < quantile(ascending, 0.25)) return 1;
  if (totals.volumeKg < quantile(ascending, 0.5)) return 2;
  if (totals.volumeKg < quantile(ascending, 0.75)) return 3;
  return 4;
}
