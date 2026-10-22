import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import { addDays, startOfWeek } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { emptyGroups, GROUP_OF_MUSCLE, MUSCLE_GROUPS, type MuscleGroup } from './muscleGroups';

/** A muscle's look on the map and in the history: not hit, hit once, hit twice or more (the goal). */
export type HitTier = 0 | 1 | 2;

/** The goal: every muscle twice a week. */
export const HITS_GOAL = 2;

/** PURE: the Monday of the week holding `day` (weeks run Monday to Sunday). */
export const weekOf = (day: ISODate): ISODate => startOfWeek(day, 'mon');

/** PURE: the week's last day, its Sunday. */
export const weekEnd = (monday: ISODate): ISODate => addDays(monday, 6);

/** PURE: a count of hits as its tier. */
export function hitTier(hits: number): HitTier {
  if (hits >= HITS_GOAL) return 2;
  return hits > 0 ? 1 : 0;
}

/**
 * PURE: how many times each group was hit across these rows (mockup, MuscleWeek): once per DIFFERENT
 * workout where it is a primary mover, half where it is only a secondary one.
 */
export function hitsByGroup(rows: readonly MuscleSetRow[]): Record<MuscleGroup, number> {
  const perWorkout = new Map<string, Map<MuscleGroup, number>>();
  for (const row of rows) {
    if (row.doneSets <= 0) continue;
    const groups = perWorkout.get(row.workoutId) ?? new Map<MuscleGroup, number>();
    perWorkout.set(row.workoutId, groups);
    groups.set(GROUP_OF_MUSCLE[row.primaryMuscle], 1);
    for (const muscle of row.secondaryMuscles) {
      const group = GROUP_OF_MUSCLE[muscle];
      if ((groups.get(group) ?? 0) < 0.5) groups.set(group, 0.5);
    }
  }
  const hits = emptyGroups();
  for (const groups of perWorkout.values()) {
    for (const [group, value] of groups) hits[group] += value;
  }
  return hits;
}

/**
 * PURE: completed sets per group across these rows (mockup, MuscleBalance): a primary muscle counts each
 * set in full, a secondary one half. A group named twice on one exercise counts once, at its larger share.
 */
export function setsByGroup(rows: readonly MuscleSetRow[]): Record<MuscleGroup, number> {
  const sets = emptyGroups();
  for (const row of rows) {
    if (row.doneSets <= 0) continue;
    const share = new Map<MuscleGroup, number>();
    for (const muscle of row.secondaryMuscles) share.set(GROUP_OF_MUSCLE[muscle], 0.5);
    share.set(GROUP_OF_MUSCLE[row.primaryMuscle], 1);
    for (const [group, part] of share) sets[group] += row.doneSets * part;
  }
  return sets;
}

/** PURE: whether every group reached the goal. */
export function everyGroupTwice(hits: Record<MuscleGroup, number>): boolean {
  return MUSCLE_GROUPS.every((group) => hits[group] >= HITS_GOAL);
}

/** PURE: the rows of the week starting `monday`. */
export function rowsOfWeek(rows: readonly MuscleSetRow[], monday: ISODate): MuscleSetRow[] {
  const sunday = weekEnd(monday);
  return rows.filter((row) => row.date >= monday && row.date <= sunday);
}
