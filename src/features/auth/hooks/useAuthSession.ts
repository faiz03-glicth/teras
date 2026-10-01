import { useEffect, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';

import { useAuthStore } from '../state/authStore';

/**
 * Restores the session once at startup (the splash stays up until it finishes) and subscribes once to
 * Supabase auth changes. Returns true when the first auth decision has been made.
 */
export function useAuthSession(): boolean {
  const { auth } = useRepositories();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    auth
      .restoreSession()
      .then((user) => {
        if (active) useAuthStore.getState().setUser(user);
      })
      .catch((error: unknown) => {
        console.error(`[auth] Session restore failed (${error instanceof Error ? error.name : 'unknown'})`); // TODO(Sentry)
        if (active) useAuthStore.getState().setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => auth.onAuthStateChange((user) => useAuthStore.getState().applyRemoteSession(user)), [auth]);

  return ready;
}
