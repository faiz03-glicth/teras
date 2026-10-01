import { useEffect, type ReactNode } from 'react';

import { hideSplash } from '@/core/bootstrap/splash';

import { useAuthSession } from '../hooks/useAuthSession';
import { useSessionScopedToasts } from '../hooks/useSessionScopedToasts';

/** Holds the splash until the session is restored, so relaunching never flashes the wrong screen. */
export function SessionGate({ children }: { children: ReactNode }) {
  const ready = useAuthSession();
  useSessionScopedToasts();

  useEffect(() => {
    if (ready) hideSplash();
  }, [ready]);

  return ready ? <>{children}</> : null;
}
