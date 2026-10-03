import type { ExerciseType } from '@/core/db/schema';
import { startOfWeek } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { recordValue, setBests, type RecordSet } from './records';

/** One finished workout an exercise was completed in, with that exercise's completed sets. */
export interface ExerciseSession {
  workoutId: string;
  name: string;
  date: ISODate;
  startedAt: string;
  sets: RecordSet[];
}

/** How many weeks the progress chart shows: about a quarter. */
const CHART_WEEKS = 12;

/** PURE: an estimated one-rep max (Epley, as the prototype has it): kg × (1 + reps / 30). */
export function e1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/** The best a session reached, by the exercise's record measure. */
const sessionValue = (type: ExerciseType, sets: readonly RecordSet[]) => recordValue(type, setBests(sets));

export interface ExerciseSummary {
  /** The record: heaviest weight, most reps or longest hold. 0 before anything is logged. */
  best: number;
  /** The best estimated one-rep max, for an exercise lifted for weight; otherwise null. */
  e1rm: number | null;
  sessions: number;
  /** The workouts whose best equals the record, so their history rows can say so. */
  recordIds: string[];
}

/** PURE: an exercise's record, best estimated max and session count, from its whole history. */
export function exerciseSummary(type: ExerciseType, sessions: readonly ExerciseSession[]): ExerciseSummary {
  const best = Math.max(0, ...sessions.map((session) => sessionValue(type, session.sets)));
  const lifts = sessions
    .flatMap((session) => session.sets)
    .filter((set) => set.status === 'done' && set.setType !== 'warmup' && (set.reps ?? 0) > 0)
    .map((set) => e1rm(set.weightKg ?? 0, set.reps ?? 0));
  return {
    best,
    e1rm: type === 'weighted' && lifts.length > 0 ? Math.max(...lifts) : null,
    sessions: sessions.length,
    recordIds:
      best > 0
        ? sessions
            .filter((session) => sessionValue(type, session.sets) === best)
            .map((session) => session.workoutId)
        : [],
  };
}

/**
 * PURE: the best set of each week the exercise was trained, oldest first, for the most recent `weeks`
 * of them. Weeks without it are left out, as in the prototype: the chart shows progress, not gaps.
 */
export function weeklyBests(
  type: ExerciseType,
  sessions: readonly ExerciseSession[],
  weeks: number = CHART_WEEKS,
): { week: ISODate; value: number }[] {
  const byWeek = new Map<ISODate, number>();
  for (const session of sessions) {
    const week = startOfWeek(session.date, 'mon');
    byWeek.set(week, Math.max(byWeek.get(week) ?? 0, sessionValue(type, session.sets)));
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-weeks)
    .map(([week, value]) => ({ week, value }));
}
