import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '../config/env';
import { getSupabase } from './client';

let client: SupabaseClient | null = null;

/**
 * The `teras-detail` project (decision 22), or null when this build has no keys for it. It has no sign-in
 * of its own: it trusts the shared project's (Third-Party Auth, supabase/detail/0002_shared_sign_in.sql),
 * so every request carries the shared project's current access token, refreshed by that client.
 */
export function getDetailSupabase(): SupabaseClient | null {
  const env = requireEnv();
  if (!env.EXPO_PUBLIC_TERAS_DETAIL_URL || !env.EXPO_PUBLIC_TERAS_DETAIL_KEY) return null;
  if (!client) {
    client = createClient(env.EXPO_PUBLIC_TERAS_DETAIL_URL, env.EXPO_PUBLIC_TERAS_DETAIL_KEY, {
      accessToken: async () => {
        const { data } = await getSupabase().auth.getSession();
        return data.session?.access_token ?? null;
      },
    });
  }
  return client;
}
