import { AuthError } from './AuthError';
import { firstName, type AuthUser } from './types';

export interface AuthFeedback {
  /** Shown above the sign-in buttons. */
  banner: string | null;
  /** Shown under the code field. */
  codeError: string | null;
}

const NONE: AuthFeedback = { banner: null, codeError: null };
export const MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  playServices: "Google sign-in needs Google Play services, which aren't available on this device.",
  invalidCode: 'That code is wrong or has expired. Check it, or send a new one.',
  generic: 'Something went wrong. Please try again.',
};

/** PURE: where (and whether) a sign-in failure is shown. Cancelling is always silent. */
export function feedbackFor(error: unknown): AuthFeedback {
  if (!(error instanceof AuthError)) return { ...NONE, banner: MESSAGES.generic };
  switch (error.code) {
    case 'Cancelled':
      return NONE;
    case 'InvalidOtp':
      return { ...NONE, codeError: MESSAGES.invalidCode };
    case 'Network':
      return { ...NONE, banner: MESSAGES.offline };
    case 'ProviderUnavailable':
      return { ...NONE, banner: MESSAGES.playServices };
    case 'Unknown':
      return { ...NONE, banner: MESSAGES.generic };
  }
}

const PROVIDER_NAMES: Record<AuthUser['provider'], string> = {
  apple: 'Apple',
  google: 'Google',
  email: 'email',
  guest: 'guest mode',
};

/** PURE: the returning-user toast. */
export function signedInMessage(user: AuthUser): { title: string; sub: string } {
  const name = firstName(user);
  return {
    title: `Signed in with ${PROVIDER_NAMES[user.provider]}`,
    sub: name ? `Welcome, ${name}.` : 'Welcome.',
  };
}
