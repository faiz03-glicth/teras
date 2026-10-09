import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { TAB_ITEMS } from '@/shared/config/tabs';
import { setTestTheme } from '@test/mocks/unistyles';
import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { Screen } from '../Screen';
import { SegmentedControl } from '../SegmentedControl';
import { tabCenters, TabBar } from '../TabBar';
import { Text } from '../Text';
import { dismissAllToasts, showInfo, showSuccess } from '../toast';

describe.each(SCHEMES)('layout components in %s', (scheme) => {
  it('Screen renders its content, scrolling or not', () => {
    const { rerender } = renderInScheme(
      <Screen>
        <Text>Static</Text>
      </Screen>,
      scheme,
    );
    expect(screen.getByText('Static')).toBeTruthy();
    rerender(
      <Screen scroll withTabBar>
        <Text>Scrolling</Text>
      </Screen>,
    );
    expect(screen.getByText('Scrolling')).toBeTruthy();
  });

  it('TabBar marks the active tab and routes presses', () => {
    const onTabPress = jest.fn();
    renderInScheme(<TabBar items={TAB_ITEMS} active="profile" onTabPress={onTabPress} />, scheme);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Profile' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByRole('tab', { name: 'Home' }).props.accessibilityState).toEqual({ selected: false });
    fireEvent.press(screen.getByRole('tab', { name: 'Workout' }));
    expect(onTabPress).toHaveBeenCalledWith('workout');
  });

  it('TabBar colours the active icon and label, apart from the well that now carries the fill', () => {
    renderInScheme(<TabBar items={TAB_ITEMS} active="workout" onTabPress={jest.fn()} />, scheme);
    expect(screen.getByRole('tab', { name: 'Workout' }).props.accessibilityState).toEqual({
      selected: true,
    });
    const idle = styleOf(screen.getByTestId('tab-home-well'));
    expect(idle.backgroundColor).toBeUndefined();
    expect(idle.boxShadow).toBeUndefined();
  });

  it('TabBar carries the well as one liquid pill, pressed into the bar under the active tab', () => {
    jest.useFakeTimers();
    try {
      const { theme } = renderInScheme(
        <TabBar items={TAB_ITEMS} active="home" onTabPress={jest.fn()} />,
        scheme,
      );
      act(() =>
        fireEvent(screen.getByTestId('tab-bar'), 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 80 } },
        }),
      );
      act(() => jest.advanceTimersByTime(20));
      const style = getAnimatedStyle(screen.getByTestId('tab-liquid')) as {
        transform: { translateX?: number; scaleX?: number }[];
      };
      // Home is the first of three equal 100pt segments: centred, the well sits at x = 50 - 92/2 = 4.
      expect(style.transform[0]?.translateX).toBeCloseTo(4, 0);
      expect(style.transform[1]?.scaleX).toBeCloseTo(1, 1);
      expect(styleOf(screen.getByTestId('tab-liquid'))).toMatchObject({
        width: 92,
        backgroundColor: theme.material.inset.background,
        boxShadow: theme.material.inset.shadow,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("TabBar's liquid pill stretches toward the new tab before gathering back into one width", () => {
    jest.useFakeTimers();
    try {
      const onTabPress = jest.fn();
      const { rerender } = renderInScheme(
        <TabBar items={TAB_ITEMS} active="home" onTabPress={onTabPress} />,
        scheme,
      );
      act(() =>
        fireEvent(screen.getByTestId('tab-bar'), 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 80 } },
        }),
      );
      rerender(<TabBar items={TAB_ITEMS} active="profile" onTabPress={onTabPress} />);
      act(() => jest.advanceTimersByTime(60));
      const mid = getAnimatedStyle(screen.getByTestId('tab-liquid')) as {
        transform: { scaleX?: number }[];
      };
      expect(mid.transform[1]?.scaleX).toBeGreaterThan(1);

      act(() => jest.advanceTimersByTime(2000));
      const settled = getAnimatedStyle(screen.getByTestId('tab-liquid')) as {
        transform: { translateX?: number; scaleX?: number }[];
      };
      expect(settled.transform[1]?.scaleX).toBeCloseTo(1, 1);
      // Profile is the last of three equal 100pt segments: centred at x = 250 - 92/2 = 204.
      expect(settled.transform[0]?.translateX).toBeCloseTo(204, 0);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('tabCenters', () => {
  it('splits the bar into one evenly-sized segment per tab, centred', () => {
    expect(tabCenters(3, 300)).toEqual([50, 150, 250]);
  });

  it('has nothing to centre before the bar is measured, or with no tabs', () => {
    expect(tabCenters(3, 0)).toEqual([]);
    expect(tabCenters(0, 300)).toEqual([]);
  });
});

describe.each(SCHEMES)('the segmented control in %s', (scheme) => {
  const OPTIONS = [
    { value: 'D', label: 'D' },
    { value: 'W', label: 'W' },
    { value: 'M', label: 'M' },
  ] as const;
  const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 126, height: 44 } } };

  it('slides one raised key along its inset track to the choice', () => {
    setTestTheme(scheme);
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={OPTIONS}
        value="W"
        onChange={onChange}
        accessibilityLabel="Range"
        testID="seg"
      />,
    );
    fireEvent(screen.getByTestId('seg'), 'layout', layout);
    expect(screen.getByTestId('seg-pill')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'M' }));
    expect(onChange).toHaveBeenCalledWith('M');
  });
});
describe('toast helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows success toasts with an optional Undo action', () => {
    const undo = jest.fn();
    showSuccess({ title: "You're all set", sub: 'Tap + whenever you do something worth counting.' });
    showSuccess({ title: 'Checked in', undo });
    showInfo({ title: 'Coming soon' });

    expect(toast.success).toHaveBeenCalledWith("You're all set", {
      id: "You're all set",
      description: 'Tap + whenever you do something worth counting.',
      action: undefined,
      duration: 3500,
    });
    expect(toast.success).toHaveBeenLastCalledWith('Checked in', {
      id: 'Checked in',
      description: undefined,
      action: { label: 'Undo', onClick: expect.any(Function) },
      duration: 5000,
    });
    // Undo runs and closes the toast (what it said is no longer true).
    const action = jest.mocked(toast.success).mock.lastCall?.[1]?.action as { onClick: () => void };
    action.onClick();
    expect(undo).toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledWith('Checked in');
    expect(toast.info).toHaveBeenCalledWith('Coming soon', {
      id: 'Coming soon',
      description: undefined,
      duration: 3000,
    });
  });

  it('keys toasts by title, so repeating a message refreshes it instead of stacking a duplicate', () => {
    showInfo({ title: "You're offline" });
    showInfo({ title: "You're offline" });
    const ids = jest.mocked(toast.info).mock.calls.map(([, options]) => options?.id);
    expect(ids).toEqual(["You're offline", "You're offline"]);
  });

  it('dismissAllToasts clears every toast', () => {
    dismissAllToasts();
    expect(toast.dismiss).toHaveBeenCalledWith();
  });
});
