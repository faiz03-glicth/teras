import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';

/**
 * Sends profile edits saved while offline: once the person is signed in, again whenever the device comes
 * back online, and whenever the app returns to the foreground. Independent of the profile query's
 * freshness, so a pending edit never waits for the next refresh. Mounted once, at the root.
 */
export function usePushPendingProfileEdits(): void {
  const { profile } = useRepositories();
  // Guests have nothing on the server to push to.
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));

  useEffect(() => {
    if (!userId) return;
    const push = () => {
      if (!onlineManager.isOnline()) return;
      profile.pushPendingEdits(userId).catch((error: unknown) => {
        // The row stays dirty and is tried again next time. Never logs the name itself.
        console.error(
          `[profile] Could not push pending edits (${error instanceof Error ? error.name : 'unknown'})`,
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
  }, [profile, userId]);
}
