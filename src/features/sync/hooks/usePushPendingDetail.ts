import { focusManager, onlineManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Repositories } from '@/core/di';
import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';
import { isISODate } from '@/shared/lib/date/isoDate';

/**
 * Best effort: a failure leaves the rows marked (and the bookmarks where they were), and the next trigger
 * tries again. Never logs row values.
 */
function syncNow(
  { detailSync, workoutDays }: Pick<Repositories, 'detailSync' | 'workoutDays'>,
  queryClient: QueryClient,
  userId: string,
): void {
  detailSync
    .sync(userId)
    .then(async ({ push, pull }) => {
      if (push.refused > 0) console.error(`[sync] teras-detail refused ${push.refused} rows`); // TODO(Sentry)
      if (pull.skipped > 0) console.error(`[sync] left out ${pull.skipped} rows from teras-detail`); // TODO(Sentry)
      if (pull.changed === 0) return;
      // Workouts from another phone: their days' frozen levels come from the shared project, as recorded.
      if (pull.earliestDate && isISODate(pull.earliestDate))
        await workoutDays.pullDays(userId, pull.earliestDate);
      await queryClient.invalidateQueries();
    })
    .catch((error: unknown) => {
      console.error(
        `[sync] Could not sync workout detail (${error instanceof Error ? error.name : 'unknown'})`,
      ); // TODO(Sentry)
    });
}

/**
 * Keeps workout detail in step with teras-detail (decision 22): sends what waits on this phone, then brings
 * in what the person's other phones stored. Runs once the person is signed in, whenever the device comes
 * back online, and whenever the app returns to the foreground. The first run on a phone that already holds
 * a history is its first upload; on a new phone, it fills in the history. Mounted once, at the root.
 */
export function usePushPendingDetail(): void {
  const { detailSync, workoutDays } = useRepositories();
  const queryClient = useQueryClient();
  // Guests have no server account yet (anonymous sign-in, decision 23, isn't built).
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));

  useEffect(() => {
    if (!userId) return;
    const run = () => {
      if (onlineManager.isOnline()) syncNow({ detailSync, workoutDays }, queryClient, userId);
    };
    run();
    const offOnline = onlineManager.subscribe((online) => {
      if (online) run();
    });
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) run();
    });
    return () => {
      offOnline();
      offFocus();
    };
  }, [detailSync, workoutDays, queryClient, userId]);
}
