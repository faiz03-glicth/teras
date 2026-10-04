import { addDays, startOfWeek, type WeekStart } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** A finished workout as the weekly chart counts it. */
export interface WeeklyWorkout {
  date: ISODate;
  durationSeconds: number;
  volumeKg: number;
  reps: number;
}

/** One week's training: the three measures Profile's chart switches between. */
export interface WeekTotals {
  /** The first day of the week. */
  week: ISODate;
  seconds: number;
  volumeKg: number;
  reps: number;
}

/** PURE: the days `weeks` weeks span: from the first day of the earliest to today. */
export function weeklyRange(
  today: ISODate,
  weeks: number,
  weekStart: WeekStart,
): { from: ISODate; to: ISODate } {
  return { from: addDays(startOfWeek(today, weekStart), -7 * (weeks - 1)), to: today };
}

/**
 * PURE: each of the last `weeks` weeks, oldest first and the current one last, with what its workouts
 * added up to. A week without a workout stays in as zeros, so the chart shows the gap.
 */
export function weeklyTotals(
  workouts: readonly WeeklyWorkout[],
  today: ISODate,
  weeks: number,
  weekStart: WeekStart,
): WeekTotals[] {
  const { from } = weeklyRange(today, weeks, weekStart);
  const totals = Array.from({ length: weeks }, (_, index) => ({
    week: addDays(from, 7 * index),
    seconds: 0,
    volumeKg: 0,
    reps: 0,
  }));
  const byWeek = new Map(totals.map((total) => [total.week, total]));
  for (const workout of workouts) {
    const total = byWeek.get(startOfWeek(workout.date, weekStart));
    if (!total) continue;
    total.seconds += workout.durationSeconds;
    total.volumeKg += workout.volumeKg;
    total.reps += workout.reps;
  }
  return totals;
}
