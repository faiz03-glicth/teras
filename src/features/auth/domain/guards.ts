import type { AuthStatus } from './types';

export interface RouteGuards {
  /** Signed in (or guest) AND onboarded: the main app. */
  canEnterApp: boolean;
  /** Everything else once booted: onboarding and login. Exactly one of the two groups is open at a time. */
  canEnterAuth: boolean;
  /** Has a session (real or guest), e.g. mid-onboarding after signing in. */
  inSession: boolean;
}

/**
 * PURE. The groups are mutually exclusive, so completing onboarding or signing out moves the person
 * to the right place through the guard alone, with no competing navigation call.
 */
export function routeGuards(status: AuthStatus, hasCompletedOnboarding: boolean): RouteGuards {
  const inSession = status === 'signedIn' || status === 'guest';
  const canEnterApp = inSession && hasCompletedOnboarding;
  return { canEnterApp, canEnterAuth: status !== 'booting' && !canEnterApp, inSession };
}
