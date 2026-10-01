import { renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { resolveScheme, useResolvedScheme } from '../hooks/useResolvedScheme';

describe('resolveScheme', () => {
  it.each([
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
    ['system', 'dark', 'dark'],
    ['system', 'light', 'light'],
    ['system', 'unspecified', 'light'],
    ['system', null, 'light'],
    ['system', undefined, 'light'],
  ] as const)('preference %s with OS %s → %s', (preference, system, expected) => {
    expect(resolveScheme(preference, system)).toBe(expected);
  });
});

describe('useResolvedScheme', () => {
  afterEach(() => jest.restoreAllMocks());

  it('follows the OS when the preference is system', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const { result } = renderHook(() => useResolvedScheme('system'));
    expect(result.current).toBe('dark');
  });

  it('ignores the OS when the preference is explicit', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const { result } = renderHook(() => useResolvedScheme('light'));
    expect(result.current).toBe('light');
  });
});
