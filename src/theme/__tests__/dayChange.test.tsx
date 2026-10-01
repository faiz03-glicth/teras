import { act, render, screen } from '@testing-library/react-native';
import Animated, { getAnimatedStyle } from 'react-native-reanimated';

import { useDayChangeMotion } from '../motion/useDayChangeMotion';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

function Probe({ day }: { day: string }) {
  return <Animated.View testID="probe" style={useDayChangeMotion(day)} />;
}
const styleOf = () =>
  getAnimatedStyle(screen.getByTestId('probe')) as { opacity: number; transform: object[] };
const prefs = () => useThemePreferencesStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  act(() => prefs().setReduceMotion('off'));
});
afterEach(() => jest.useRealTimers());

describe('dayChange', () => {
  it('stays at rest on first render', () => {
    render(<Probe day="2026-09-16" />);
    expect(styleOf().opacity).toBe(1);
    expect(styleOf().transform).toEqual([{ translateY: 0 }]);
  });

  it('refreshes in place when the day changes: dimmed and lowered a little, then at rest', () => {
    const { rerender } = render(<Probe day="2026-09-16" />);
    rerender(<Probe day="2026-09-17" />);
    act(() => jest.advanceTimersByTime(16));
    expect(styleOf().opacity).toBeLessThan(1);
    expect(styleOf().opacity).toBeGreaterThanOrEqual(motion.dayChange.fromOpacity);
    act(() => jest.advanceTimersByTime(motion.dayChange.durationMs + 50));
    expect(styleOf().opacity).toBe(1);
    expect(styleOf().transform).toEqual([{ translateY: 0 }]);
  });

  it('never blanks, however fast the days change, and ends at rest', () => {
    const { rerender } = render(<Probe day="2026-09-10" />);
    for (const day of ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14']) {
      rerender(<Probe day={day} />);
      act(() => jest.advanceTimersByTime(20));
      expect(styleOf().opacity).toBeGreaterThanOrEqual(motion.dayChange.fromOpacity);
    }
    act(() => jest.advanceTimersByTime(motion.dayChange.durationMs + 50));
    expect(styleOf().opacity).toBe(1);
  });

  it('does not move with Reduce Motion', () => {
    act(() => prefs().setReduceMotion('on'));
    const { rerender } = render(<Probe day="2026-09-16" />);
    rerender(<Probe day="2026-09-17" />);
    act(() => jest.advanceTimersByTime(16));
    expect(styleOf().opacity).toBe(1);
  });
});
