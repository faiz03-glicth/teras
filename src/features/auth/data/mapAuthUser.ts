import type { User } from '@supabase/supabase-js';

import type { AuthProvider, AuthUser } from '../domain/types';

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function providerOf(value: unknown): AuthProvider {
  return value === 'apple' || value === 'google' ? value : 'email';
}

/** Maps a Supabase user (metadata is untyped external data) to the domain AuthUser. */
export function mapAuthUser(user: User): AuthUser {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  return {
    id: user.id,
    email: text(user.email),
    displayName: text(metadata.full_name) ?? text(metadata.name),
    avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture),
    provider: providerOf(user.app_metadata?.provider),
  };
}
