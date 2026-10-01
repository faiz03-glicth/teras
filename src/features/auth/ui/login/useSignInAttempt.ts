import { useState } from 'react';

import { useSessionActions } from '@/shared/actions/session';
import { haptics } from '@/shared/lib/haptics';
import { showSuccess } from '@/shared/ui/toast';

import { AuthError } from '../../domain/AuthError';
import { feedbackFor, signedInMessage, type AuthFeedback } from '../../domain/authFeedback';
import type { AuthUser } from '../../domain/types';

/**
 * Runs one sign-in attempt: light haptic → clear old feedback → call → success haptic and continue,
 * or show the right feedback (Cancelled stays silent).
 */
export function useSignInAttempt() {
  const { finishOnboarding } = useSessionActions();
  const [feedback, setFeedback] = useState<AuthFeedback>({ banner: null, codeError: null });

  /** Set up comes before Sign in, so signing in is the last step: finish, and the route guard opens Home. */
  const continueAfterSignIn = async (user: AuthUser) => {
    haptics.success();
    await finishOnboarding({ silent: true });
    if (user.provider !== 'guest') showSuccess(signedInMessage(user));
  };

  const showFailure = (error: unknown) => {
    const next = feedbackFor(error);
    setFeedback(next);
    if (!(error instanceof AuthError) || error.code === 'Unknown') {
      // Never logs tokens, codes or addresses: only the error kind.
      console.error(`[auth] Sign-in failed (${error instanceof Error ? error.name : 'unknown'})`); // TODO(Sentry)
    }
  };

  const attempt = async (signIn: () => Promise<AuthUser>): Promise<void> => {
    haptics.light();
    setFeedback({ banner: null, codeError: null });
    let user: AuthUser;
    try {
      user = await signIn();
    } catch (error) {
      showFailure(error);
      return;
    }
    await continueAfterSignIn(user);
  };

  /** For requests that don't sign in (sending a code). Returns whether it succeeded. */
  const request = async (call: () => Promise<void>): Promise<boolean> => {
    haptics.light();
    setFeedback({ banner: null, codeError: null });
    try {
      await call();
      return true;
    } catch (error) {
      showFailure(error);
      return false;
    }
  };

  return {
    feedback,
    attempt,
    request,
    clearCodeError: () => setFeedback((current) => ({ ...current, codeError: null })),
    clearFeedback: () => setFeedback({ banner: null, codeError: null }),
  };
}
