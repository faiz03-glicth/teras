import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { PressableScale } from '@/shared/ui/PressableScale';

import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

beforeEach(() => {
  jest.useFakeTimers();
  act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
});
afterEach(() => jest.useRealTimers());

type Transform = { scale?: number; translateY?: number }[];
const transformOf = () => getAnimatedStyle(screen.getByTestId('key')).transform as Transform;
const part = (name: 'scale' | 'translateY') => transformOf().find((entry) => name in entry)?.[name];

describe('a small key sinking as it is held', () => {
  const key = (sink?: number) => (
    <PressableScale testID="key" sink={sink} onPress={() => undefined}>
      <Text>Key</Text>
    </PressableScale>
  );

  it('moves down by its sink as it shrinks, on the animated style, and returns on release', () => {
    render(key(2));
    expect(part('translateY')).toBe(0);

    fireEvent(screen.getByTestId('key'), 'pressIn');
    act(() => jest.advanceTimersByTime(motion.press.inMs + 20));
    expect(part('translateY')).toBeCloseTo(2, 1);
    expect(part('scale')).toBeCloseTo(motion.press.scale, 2);

    fireEvent(screen.getByTestId('key'), 'pressOut');
    act(() => jest.advanceTimersByTime(2000));
    expect(part('translateY')).toBeCloseTo(0, 1);
    expect(part('scale')).toBeCloseTo(1, 2);
  });

  it('only shrinks when it has no sink: nothing else moves', () => {
    render(key());

    fireEvent(screen.getByTestId('key'), 'pressIn');
    act(() => jest.advanceTimersByTime(motion.press.inMs + 20));
    expect(part('translateY')).toBeUndefined();
    expect(part('scale')).toBeCloseTo(motion.press.scale, 2);
  });
});
