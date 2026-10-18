import { QueryClient } from '@tanstack/react-query';

import { isNetworkError } from '../errors/AppError';

export const MAX_NETWORK_RETRIES = 2;

/** Only transient network failures are worth retrying; everything else fails fast. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < MAX_NETWORK_RETRIES;
}

/**
 * A read of the phone's own database that only the app's own writes change, and every one of those writes
 * invalidates it: fresh until then. Without it a screen opened again after 30 s reads again, synchronously,
 * on the JS thread, while its page slides in.
 */
export const LOCAL_READ = { networkMode: 'always', staleTime: Infinity } as const;

/** How long a summary nobody is looking at stays in memory: small, and costly to read again. */
export const SUMMARY_GC_MS = 30 * 60_000;

/** How long an idle prefetch waits for a quiet moment before it runs anyway. */
export const PREFETCH_IDLE_TIMEOUT_MS = 2_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
