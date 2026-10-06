import { focusManager, onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { AppError, isNetworkError } from '@/core/errors/AppError';
import { useAuthStore } from '@/features/auth/state/authStore';

import { streakKeys } from './useStreakDays';

/**
 * Brings in the days checked in on Streak: once the person is signed in, again whenever the device comes
 * back online, and whenever the app returns to the foreground (the same moments Teras sends its own days).
 * A pull that changed anything refreshes the screens showing them. Mounted once, at the root.
 */
export function usePullStreakDays(): void {
  const { streakDays } = useRepositories();
  const queryClient = useQueryClient();
  // Guests have no Streak account linked to them.
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));

  useEffect(() => {
    if (!userId) return;
    const pull = () => {
      if (!onlineManager.isOnline()) return;
      streakDays
        .pull(userId)
        .then((changed) => {
          if (changed > 0) void queryClient.invalidateQueries({ queryKey: streakKeys.days });
        })
        .catch((error: unknown) => {
          // Offline, or a server without the Streak link: nothing to say, the next pull tries again.
          if (isNetworkError(error) || (error instanceof AppError && error.code === 'Unavailable')) return;
          console.error(
            `[streakDays] Could not pull Streak days (${error instanceof Error ? error.name : 'unknown'})`,
          ); // TODO(Sentry)
        });
    };
    pull();
    const offOnline = onlineManager.subscribe((online) => {
      if (online) pull();
    });
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) pull();
    });
    return () => {
      offOnline();
      offFocus();
    };
  }, [queryClient, streakDays, userId]);
}
