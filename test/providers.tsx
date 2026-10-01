import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

import { DiProvider } from '@/core/DiProvider';
import type { ColorScheme } from '@/theme';

import { createFakeRepositories } from './fakes/fakeRepositories';
import { renderInScheme } from './render';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    // Infinite gcTime: no garbage-collection timers left running after a test.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/** Wraps a tree in fake repositories and a fresh query client. */
export function createWrapper(
  repositories = createFakeRepositories(),
  queryClient = createTestQueryClient(),
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DiProvider repositories={repositories}>{children}</DiProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, repositories, queryClient };
}

export function renderWithApp(
  ui: ReactElement,
  { scheme = 'light' as ColorScheme, repositories = createFakeRepositories() } = {},
) {
  const { Wrapper } = createWrapper(repositories);
  return { ...renderInScheme(ui, scheme, { wrapper: Wrapper }), repositories };
}
