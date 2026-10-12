import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { AppError, isNetworkError } from '@/core/errors/AppError';
import { useAuthStore } from '@/features/auth/state/authStore';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { streakKeys } from './useStreakDays';

/**
 * How a log went: logged; offline (try again with a connection); unavailable (this server has no
 * `teras_log_day` yet: trying again won't help); failed (anything else); busy (one already on its way, or
 * no account to log it in).
 */
export type LogDayResult = 'logged' | 'offline' | 'unavailable' | 'failed' | 'busy';

/**
 * Logs a day with no details: there was a workout, but its lifts weren't entered. The day becomes a Workout
 * check-in on Streak, so it counts toward the Streak, and reads as logged here (never as a rest day). It
 * needs an account and the network; `logDay` resolves how it went (LogDayResult). One at a time: a second
 * call while one is on its way does nothing ('busy').
 */
export function useLogDayNoDetails() {
  const { streakDays } = useRepositories();
  const queryClient = useQueryClient();
  // Guests have no Streak account to count it in.
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));
  const busy = useRef(false);
  const [logging, setLogging] = useState(false);

  const logDay = useCallback(
    async (day: ISODate): Promise<LogDayResult> => {
      if (!userId || busy.current) return 'busy';
      busy.current = true;
      setLogging(true);
      try {
        await streakDays.logDay(userId, day);
        void queryClient.invalidateQueries({ queryKey: streakKeys.days });
        return 'logged';
      } catch (cause) {
        if (isNetworkError(cause)) return 'offline';
        if (cause instanceof AppError && cause.code === 'Unavailable') return 'unavailable';
        console.error(
          `[streakDays] Could not log a day (${cause instanceof Error ? cause.name : 'unknown'})`,
        ); // TODO(Sentry)
        return 'failed';
      } finally {
        busy.current = false;
        setLogging(false);
      }
    },
    [queryClient, streakDays, userId],
  );

  return { canLog: userId !== null, logDay, logging };
}
