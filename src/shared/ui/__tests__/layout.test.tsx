import { fireEvent, render, screen } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { TAB_ITEMS } from '@/shared/config/tabs';
import { setTestTheme } from '@test/mocks/unistyles';
import { renderInScheme, SCHEMES } from '@test/render';

import { Screen } from '../Screen';
import { SegmentedControl } from '../SegmentedControl';
import { TabBar } from '../TabBar';
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
});

describe.each(SCHEMES)('the segmented control in %s', (scheme) => {
  const OPTIONS = [
    { value: 'D', label: 'D' },
    { value: 'W', label: 'W' },
    { value: 'M', label: 'M' },
  ] as const;
  const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 126, height: 44 } } };

  it('glides one frosted pill to the choice with Liquid Glass, and has none in Classic', () => {
    setTestTheme(scheme, 'glass');
    const onChange = jest.fn();
    const { rerender } = render(
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

    setTestTheme(scheme, 'classic');
    rerender(
      <SegmentedControl
        options={OPTIONS}
        value="W"
        onChange={onChange}
        accessibilityLabel="Range"
        testID="seg"
      />,
    );
    expect(screen.queryByTestId('seg-pill')).toBeNull();
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
