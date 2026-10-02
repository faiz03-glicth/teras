import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '../config/env';
import { LargeSecureStore } from './LargeSecureStore';

let client: SupabaseClient | null = null;

/** Lazily created so a missing .env surfaces on the boot error screen instead of crashing at import time. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const env = requireEnv();
    client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: new LargeSecureStore(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
