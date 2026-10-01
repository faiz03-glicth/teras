/*
 * The pager's swipe path. The scroll handler itself can't run under Jest (Reanimated's scroll handler is
 * a native worklet there), so its pieces are checked here and the swipe as a whole on a device.
 */
import { screen } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { motion } from '@/theme/tokens/motion';
import { renderInScheme } from '@test/render';

import { dotLayout } from '../PageDots';
import { landedPage, Pager } from '../Pager';
import { PressableScale } from '../PressableScale';

const { landWithin, pressDelayMs } = motion.pager;

describe('a pager page landing', () => {
  it('lands once it has settled on a new page', () => {
    expect(landedPage(1, 0, 3)).toBe(1);
    expect(landedPage(1 - landWithin / 2, 0, 3)).toBe(1);
    expect(landedPage(2 + landWithin / 2, 1, 3)).toBe(2);
  });

  it('has not landed while still on its way, or when it snaps back to where it was', () => {
    expect(landedPage(0.5, 0, 3)).toBeNull();
    expect(landedPage(1 - landWithin * 3, 0, 3)).toBeNull();
    expect(landedPage(0, 0, 3)).toBeNull();
  });

  it('never lands beyond the first or last page (overscroll)', () => {
    expect(landedPage(-0.01, 1, 3)).toBe(0);
    expect(landedPage(2.01, 1, 3)).toBe(2);
    expect(landedPage(2.01, 2, 3)).toBeNull();
  });
});

describe('the pager', () => {
  /** The press delay every Pressable rendered was given (the pressables inside PressableScale). */
  const pressDelays = () =>
    screen.UNSAFE_root.findAll(
      (node) => typeof node.type !== 'string' && 'unstable_pressDelay' in node.props,
    ).map((node) => node.props.unstable_pressDelay as number | undefined);

  const pager = (index: number) => (
    <Pager
      count={3}
      index={index}
      onIndexChange={jest.fn()}
      progress={makeMutable(0)}
      inset={24}
      renderPage={(page) => (
        <PressableScale testID={`page-${page}`} onPress={jest.fn()}>
          <Text>{`Page ${page}`}</Text>
        </PressableScale>
      )}
    />
  );

  it('never moves the pages by changing its start offset (the native view would jump, even mid-drag)', () => {
    // Changing `index` slides the pages with scrollTo, which Jest doesn't implement (it warns).
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = renderInScheme(pager(0), 'light');
    const offset = () => screen.UNSAFE_getByType(ScrollView).props.contentOffset;
    const start = offset();
    rerender(pager(1));
    rerender(pager(2));
    expect(offset()).toBe(start);
    jest.restoreAllMocks();
  });

  it("delays presses on its pages, so a swipe that starts on a control doesn't press it", () => {
    renderInScheme(pager(0), 'light');
    expect(pressDelays().length).toBeGreaterThanOrEqual(3);
    expect(new Set(pressDelays())).toEqual(new Set([pressDelayMs]));
  });

  it('presses anywhere else begin at once', () => {
    renderInScheme(
      <PressableScale testID="alone" onPress={jest.fn()}>
        <Text>Alone</Text>
      </PressableScale>,
      'light',
    );
    expect(pressDelays().length).toBeGreaterThan(0);
    expect(new Set(pressDelays())).toEqual(new Set([undefined]));
  });
});

describe('the page dots follow the pager with transforms only', () => {
  const total = (dots: { width: number }[]) => dots.reduce((sum, dot) => sum + dot.width, 0);

  it('their widths always add up to the same, so the row never changes size mid-swipe', () => {
    const settled = total(dotLayout(0, 3));
    for (const position of [0, 0.25, 0.5, 1, 1.4, 2, -0.3, 2.3]) {
      expect(total(dotLayout(position, 3))).toBeCloseTo(settled);
    }
  });

  it('the pill is on the current page and stretches between two pages mid-swipe', () => {
    expect(dotLayout(1, 3).map((dot) => dot.width)).toEqual([6, 20, 6]);
    expect(dotLayout(0.5, 3).map((dot) => dot.width)).toEqual([13, 13, 6]);
  });

  it('each dot sits a gap after the one before it', () => {
    const dots = dotLayout(0.3, 3);
    dots.slice(1).forEach((dot, index) => {
      const before = dots[index];
      expect(dot.x).toBeCloseTo((before?.x ?? 0) + (before?.width ?? 0) + 6);
    });
  });
});
