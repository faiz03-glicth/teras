import { act, render, renderHook, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { getAnimatedStyle } from 'react-native-reanimated';
import { UnistylesRuntime } from 'react-native-unistyles';

import { buildTheme } from '../buildTheme';
import { useStateTransition } from '../motion/useStateTransition';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { ThemeRuntimeBridge } from '../sync/ThemeRuntimeBridge';
import { motion } from '../tokens/motion';

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: {
    pushStackEntry: jest.fn((props: unknown) => props),
    replaceStackEntry: jest.fn((_entry: unknown, props: unknown) => props),
    popStackEntry: jest.fn(),
  },
}));

const prefs = () => useThemePreferencesStore.getState();
// The canvas as the bridge renders it: the stored palette and style (Liquid Glass by default).
const canvas = (scheme: 'light' | 'dark') =>
  buildTheme(scheme, prefs().paletteId, prefs().style).colors.canvas;
// The veil is hidden from screen readers on purpose, so the query has to include hidden elements.
const veil = () => getAnimatedStyle(screen.getByTestId('theme-veil', { includeHiddenElements: true }));

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  act(() => useThemePreferencesStore.setState({ preference: 'light', reduceMotion: 'off' }));
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('theme transitions', () => {
  it('apply the theme at launch without any transition', () => {
    render(<ThemeRuntimeBridge />);
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('light');
    expect(SystemBars.pushStackEntry).toHaveBeenCalledWith({ style: 'dark' });
  });

  it('fade through a change: the new theme is swapped in only once the veil covers the app', () => {
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    // The choice is stored at once; the visual swap waits for the veil (never a half-themed frame).
    expect(prefs().preference).toBe('dark');
    expect(UnistylesRuntime.setTheme).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(motion.themeTransition.coverMs + 50));
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark');
    expect(SystemBars.replaceStackEntry).toHaveBeenCalledWith(expect.anything(), { style: 'light' });
    // The theme never touches the motion setting.
    expect(prefs().reduceMotion).toBe('off');
  });

  it("fade through the screen's own background: entering light never washes the screen white first", () => {
    act(() => useThemePreferencesStore.setState({ preference: 'dark' }));
    render(<ThemeRuntimeBridge />);

    act(() => prefs().setPreference('light'));
    act(() => jest.advanceTimersByTime(motion.themeTransition.coverMs / 2));
    // The content fades into the dark canvas it's already on; the light one only emerges as the veil lifts.
    expect(veil().backgroundColor).toBe(canvas('dark'));
    expect(veil().opacity).toBeGreaterThan(0);
  });

  it('a veil that is still lifting keeps its colour when the theme changes again (no jump)', () => {
    render(<ThemeRuntimeBridge />);

    act(() => prefs().setPreference('dark'));
    act(() => jest.advanceTimersByTime(motion.themeTransition.coverMs + motion.themeTransition.holdMs + 60));
    expect(UnistylesRuntime.setTheme).toHaveBeenLastCalledWith('dark');
    expect(veil().backgroundColor).toBe(canvas('light'));

    act(() => prefs().setPreference('light'));
    expect(veil().backgroundColor).toBe(canvas('light'));
    act(() => jest.advanceTimersByTime(1000));
    expect(UnistylesRuntime.setTheme).toHaveBeenLastCalledWith('light');
    expect(veil().opacity).toBe(0);
  });

  it('switch instantly with Reduce Motion', () => {
    act(() => prefs().setReduceMotion('on'));
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark');
    expect(prefs().reduceMotion).toBe('on');
  });

  it('let the latest choice win: switching back before the swap never shows the other theme', () => {
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    act(() => jest.advanceTimersByTime(40));
    act(() => prefs().setPreference('light'));
    act(() => jest.advanceTimersByTime(600));
    expect(UnistylesRuntime.setTheme).not.toHaveBeenCalledWith('dark');
  });
});

describe('useStateTransition', () => {
  it('transitions the listed properties at the chosen speed, and instantly with Reduce Motion', () => {
    const { result, rerender } = renderHook(() => useStateTransition(['borderColor'], 'normal'));
    expect(result.current).toMatchObject({
      transitionProperty: ['borderColor'],
      transitionDuration: motion.duration.normal,
    });

    act(() => prefs().setReduceMotion('on'));
    rerender({});
    expect(result.current.transitionDuration).toBe(0);
  });
});
