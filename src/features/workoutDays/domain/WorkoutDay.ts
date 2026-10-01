import type { HeatLevel } from '@/features/heatmap/domain/grid';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** What a day's workouts add up to. Only completed sets count. */
export interface DayTotals {
  /** Reps × weight over the day's completed sets, in kilograms. Timed sets add 0. */
  volumeKg: number;
  /** Completed sets. */
  sets: number;
  /** Workouts with at least one completed set. */
  workouts: number;
}

/** The per-day summary Teras shares with Streak. Nothing else about a workout leaves the phone. */
export interface WorkoutDay extends DayTotals {
  date: ISODate;
  level: HeatLevel;
}

/** Level names, indexable by a HeatLevel. */
export const LEVEL_NAMES = ['No workout', 'Light', 'Moderate', 'Strong', 'Peak'] as const;
