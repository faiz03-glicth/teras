export type AuthProvider = 'apple' | 'google' | 'email' | 'guest';
export type AuthStatus = 'booting' | 'signedOut' | 'guest' | 'signedIn';
export type AuthIntent = 'new' | 'existing';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
}

/** PURE: the session status a user implies. */
export function statusFor(user: AuthUser | null): Exclude<AuthStatus, 'booting'> {
  if (!user) return 'signedOut';
  return user.provider === 'guest' ? 'guest' : 'signedIn';
}

/** PURE: "Faiz" from "Faiz Ahmad"; null when there is no usable name. */
export function firstName(user: Pick<AuthUser, 'displayName'>): string | null {
  const first = user.displayName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
