import { QueryClient } from '@tanstack/react-query';

import { isNetworkError } from '../errors/AppError';

export const MAX_NETWORK_RETRIES = 2;

/** Only transient network failures are worth retrying; everything else fails fast. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < MAX_NETWORK_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
