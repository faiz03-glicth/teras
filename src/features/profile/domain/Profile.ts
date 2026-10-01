import type { AuthProvider } from '@/features/auth/domain/types';

export interface Profile {
  id: string;
  /** Null for the local guest profile. */
  userId: string | null;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
}

/** The longest display name the server accepts (supabase/migrations/0002_harden_profiles.sql). */
export const MAX_DISPLAY_NAME_LENGTH = 100;

/**
 * PURE: a display name as the server stores it: control characters removed, trimmed, at most 100
 * characters, and null when nothing is left. The same cleaning as the sign-up trigger, so a name sent
 * from the phone can never be refused by the server's constraint (a refused push would retry forever).
 */
export function cleanDisplayName(name: string | null): string | null {
  const cleaned = (name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);
  return cleaned || null;
}

/** PURE: what to call someone on screen. */
export function profileTitle(profile: Pick<Profile, 'displayName' | 'email' | 'provider'>): string {
  if (profile.provider === 'guest') return 'Guest';
  return profile.displayName?.trim() || profile.email || 'Teras member';
}
