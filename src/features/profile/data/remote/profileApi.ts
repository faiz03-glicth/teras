import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';

import { cleanDisplayName } from '../../domain/Profile';

/** Server rows are external data: validated, never cast. */
const remoteProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
  provider: z.enum(['apple', 'google', 'email']).catch('email'),
  time_zone: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type RemoteProfile = z.infer<typeof remoteProfileSchema>;

/** Data source: Supabase `public.profiles` only (RLS limits every call to the signed-in user's row). */
export interface ProfileApi {
  fetch(id: string): Promise<RemoteProfile | null>;
  updateDisplayName(id: string, displayName: string | null): Promise<void>;
}

function toAppError(error: { message: string }): AppError {
  const offline = /network request failed|failed to fetch|network error/i.test(error.message);
  return new AppError(
    offline ? 'Network' : 'Unknown',
    offline ? 'Network request failed' : 'Profile request failed',
  );
}

const COLUMNS =
  'id,email,display_name,username,avatar_url,provider,time_zone,created_at,updated_at,deleted_at';

export function createProfileApi(supabase: SupabaseClient): ProfileApi {
  return {
    async fetch(id) {
      const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
      if (error) throw toAppError(error);
      if (!data) return null;
      const parsed = remoteProfileSchema.safeParse(data);
      if (!parsed.success) throw new AppError('Unknown', 'Profile response had an unexpected shape');
      return parsed.data;
    },
    async updateDisplayName(id, displayName) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: cleanDisplayName(displayName) })
        .eq('id', id);
      if (error) throw toAppError(error);
    },
  };
}
