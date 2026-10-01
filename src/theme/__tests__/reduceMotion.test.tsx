import { act, renderHook } from '@testing-library/react-native';

import { resolveReduceMotion, useReduceMotion } from '../hooks/useReduceMotion';
import { useNavigationMotion } from '../motion/useNavigationMotion';
import { useSystemMotionStore } from '../state/systemMotionStore';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

beforeEach(() => {
  act(() => {
    useThemePreferencesStore.getState().setReduceMotion('system');
    useSystemMotionStore.setState({ reduceMotion: false });
  });
});

describe('resolveReduceMotion', () => {
  it.each([
    ['system', false, false],
    ['system', true, true],
    ['on', false, true],
    ['off', true, false],
  ] as const)('%s with the phone at %s → %s', (preference, system, expected) => {
    expect(resolveReduceMotion(preference, system)).toBe(expected);
  });
});

describe('useReduceMotion', () => {
  it('follows the phone live by default, and the in-app choice overrides it', () => {
    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);

    act(() => useSystemMotionStore.getState().setReduceMotion(true));
    expect(result.current).toBe(true);

    act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
    expect(result.current).toBe(false);

    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    act(() => useSystemMotionStore.getState().setReduceMotion(false));
    expect(result.current).toBe(true);
  });

  it('persists the choice with the other appearance preferences', () => {
    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    expect(
      useThemePreferencesStore.persist.getOptions().partialize?.(useThemePreferencesStore.getState()),
    ).toMatchObject({
      reduceMotion: 'on',
    });
  });
});

describe('useNavigationMotion', () => {
  it('slides normally and only fades with Reduce Motion', () => {
    const { result } = renderHook(() => useNavigationMotion());
    expect(result.current).toEqual({ ...motion.navigation.full, fadeMs: motion.navigation.fadeMs });
    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    expect(result.current).toEqual({
      push: 'fade',
      groupSwitch: 'fade',
      tabs: 'fade',
      fadeMs: motion.navigation.fadeMs,
    });
  });

  it('never changes the tab transition, so toggling Reduce Motion cannot remount (blank) the tabs', () => {
    expect(motion.navigation.reduced.tabs).toBe(motion.navigation.full.tabs);
  });
});
