import { useEffect } from 'react';

import { registerAuthAutoRefresh } from './appStateRefresh';
import { getSupabase } from './client';

/** Refreshes Supabase tokens only while the app is in the foreground. */
export function useAuthAutoRefresh(): void {
  useEffect(() => registerAuthAutoRefresh(getSupabase().auth), []);
}
