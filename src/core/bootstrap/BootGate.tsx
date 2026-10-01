import { useEffect, type ReactNode } from 'react';

import { BootErrorScreen } from './BootErrorScreen';
import { hideSplash, keepSplashVisible } from './splash';
import { useAppBootstrap } from './useAppBootstrap';

keepSplashVisible();

/**
 * Renders nothing until config, fonts and migrations are ready. On failure it hides the splash and shows
 * a readable error; on success the splash stays up until the session gate has restored the session.
 */
export function BootGate({ children }: { children: ReactNode }) {
  const state = useAppBootstrap();

  useEffect(() => {
    if (state.status === 'error') hideSplash();
  }, [state.status]);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <BootErrorScreen title={state.title} detail={state.detail} />;
  return <>{children}</>;
}
