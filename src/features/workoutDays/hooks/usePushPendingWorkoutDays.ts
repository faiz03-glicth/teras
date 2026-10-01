import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';

/**
 * Sends training-day summaries that haven't reached Supabase (and so Streak) yet: once the person is signed
 * in, again whenever the device comes back online, and whenever the app returns to the foreground. This is
 * also how days logged as a guest go up after signing in. Mounted once, at the root.
 */
export function usePushPendingWorkoutDays(): void {
  const { workoutDays } = useRepositories();
  // Guests have nothing on the server to push to.
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));

  useEffect(() => {
    if (!userId) return;
    const push = () => {
      if (!onlineManager.isOnline()) return;
      workoutDays.pushPending(userId).catch((error: unknown) => {
        // The rows stay dirty and are tried again next time.
        console.error(
          `[workoutDays] Could not push pending days (${error instanceof Error ? error.name : 'unknown'})`,
        ); // TODO(Sentry)
      });
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
  }, [workoutDays, userId]);
}
