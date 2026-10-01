import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createFakeRepositories } from '@test/fakes/fakeRepositories';

import { DiProvider, useRepositories } from '../DiProvider';

describe('useRepositories', () => {
  it('returns the injected repositories', () => {
    const repositories = createFakeRepositories();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DiProvider repositories={repositories}>{children}</DiProvider>
    );
    const { result } = renderHook(() => useRepositories(), { wrapper });
    expect(result.current).toBe(repositories);
  });

  it('fails loudly outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useRepositories())).toThrow(/inside <DiProvider>/);
  });
});
