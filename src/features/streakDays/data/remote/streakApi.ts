import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';

/**
 * The Streak → Teras half of the link: Supabase `streak_workout_dates`, which returns the dates of the
 * person's own Workout check-ins on Streak (dates only). Rows come ordered by (changedAt, date), at most
 * STREAK_PAGE_SIZE a call; the last row's pair is the bookmark for the next call. Server rows are external
 * data: validated, never cast.
 */
export const STREAK_PAGE_SIZE = 1000;

const remoteRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checked_in: z.boolean(),
  changed_at: z.string().min(1),
});

/** One date whose Workout check-ins changed on Streak: checked in now, or removed. */
export interface StreakDateRow {
  date: string;
  checkedIn: boolean;
  /** The server's clock, kept verbatim (to the microsecond): it goes back as the bookmark. */
  changedAt: string;
}

/** Where to carry on from: the last row already applied. */
export interface StreakBookmark {
  changedAt: string;
  date: string;
}

export type StreakApiErrorCode = 'Network' | 'Unavailable' | 'Unknown';

/**
 * Data source: Supabase `streak_workout_dates` (it runs as the caller, so RLS keeps it to their rows) and
 * `teras_log_day`.
 */
export interface StreakApi {
  /** The dates changed after the bookmark (`null`: from the beginning), oldest change first. */
  workoutDates(bookmark: StreakBookmark | null): Promise<StreakDateRow[]>;
  /**
   * A day logged with no details: the caller's Workout check-in for `date` on Streak, so it counts toward
   * the Streak. Logging a day already checked in changes nothing.
   */
  logDay(date: string): Promise<void>;
}

function toAppError(error: { message: string; code?: string }): AppError<StreakApiErrorCode> {
  if (/network request failed|failed to fetch|network error/i.test(error.message)) {
    return new AppError('Network', 'Network request failed');
  }
  // PGRST202: the function is not on this server (the Streak link has not been set up there).
  if (error.code === 'PGRST202') return new AppError('Unavailable', 'Streak link is not set up');
  return new AppError('Unknown', 'Streak request failed');
}

export function createStreakApi(supabase: SupabaseClient): StreakApi {
  return {
    async workoutDates(bookmark) {
      const { data, error } = await supabase.rpc(
        'streak_workout_dates',
        bookmark ? { since: bookmark.changedAt, since_date: bookmark.date } : {},
      );
      if (error) throw toAppError(error);
      const parsed = z.array(remoteRowSchema).safeParse(data ?? []);
      if (!parsed.success) throw new AppError('Unknown', 'Streak dates response had an unexpected shape');
      return parsed.data.map((row) => ({
        date: row.date,
        checkedIn: row.checked_in,
        changedAt: row.changed_at,
      }));
    },

    async logDay(date) {
      const { error } = await supabase.rpc('teras_log_day', { day: date });
      if (error) throw toAppError(error);
    },
  };
}
