import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';

import type { DetailSyncRepository } from '../data/DetailSyncRepository';

/** Best effort: a failure leaves the rows marked, and the next trigger tries again. Never logs row values. */
function pushNow(detailSync: DetailSyncRepository, userId: string): void {
  detailSync
    .pushPending(userId)
    .then(({ refused }) => {
      if (refused > 0) console.error(`[sync] teras-detail refused ${refused} rows`); // TODO(Sentry)
    })
    .catch((error: unknown) => {
      console.error(
        `[sync] Could not send workout detail (${error instanceof Error ? error.name : 'unknown'})`,
      ); // TODO(Sentry)
    });
}

/**
 * Copies workout detail waiting on this phone to teras-detail (decision 22): once the person is signed in,
 * whenever the device comes back online, and whenever the app returns to the foreground. The first run on
 * a phone that already holds a history is its first upload. Mounted once, at the root.
 */
export function usePushPendingDetail(): void {
  const { detailSync } = useRepositories();
  // Guests have no server account yet (anonymous sign-in, decision 23, isn't built).
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));

  useEffect(() => {
    if (!userId) return;
    const push = () => {
      if (onlineManager.isOnline()) pushNow(detailSync, userId);
    };
    push();
    const offOnline = onlineManager.subscribe((online) => {
      if (online) push();
    });
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) push();
    });
    return () => {
      offOnline();
      offFocus();
    };
  }, [detailSync, userId]);
}
