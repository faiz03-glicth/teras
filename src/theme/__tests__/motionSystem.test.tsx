import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import Animated, { getAnimatedStyle } from 'react-native-reanimated';

import { buildLevelGrid } from '@/features/heatmap/domain/grid';
import { HeatCell } from '@/shared/ui/HeatCell';
import { Heatmap } from '@/shared/ui/Heatmap';
import { LogoMark } from '@/shared/ui/LogoMark';
import { ScreenTransition } from '@/shared/ui/ScreenTransition';
import { SelectableTile } from '@/shared/ui/SelectableTile';
import { renderInScheme, SCHEMES } from '@test/render';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';

import { heatmapReveal, heatmapRevealDelay, heatmapStack } from '../motion/cssMotion';
import { layoutMotion } from '../motion/layoutMotion';
import { useMotion } from '../motion/useMotion';
import { useSelectionMotion } from '../motion/useSelectionMotion';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

const prefs = () => useThemePreferencesStore.getState();
beforeEach(() => act(() => prefs().setReduceMotion('off')));

describe('the motion system', () => {
  it('offers every preset by meaning while motion is allowed', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.heatmapReveal(3, 2)).toMatchObject({
      animationDelay: heatmapRevealDelay(3, 2),
      animationDuration: motion.heatmapReveal.durationMs,
    });
    expect(result.current.staggerIn(2)).toMatchObject({ animationDelay: 2 * motion.staggerIn.gapMs });
    expect(result.current.pulse(true)).not.toBeNull();
    expect(result.current.pulse(false)).toBeNull();
  });

  it('resolves Reduce Motion in one place: every CSS preset becomes "show the final state"', () => {
    const { result } = renderHook(() => useMotion());
    act(() => prefs().setReduceMotion('on'));
    expect(result.current.reduced).toBe(true);
    expect(result.current.heatmapReveal(3, 2)).toBeNull();
    expect(result.current.staggerIn(2)).toBeNull();
    expect(result.current.pulse(true)).toBeNull();
  });

  it('never replays an entrance: once Reduce Motion stops it, turning motion back on leaves it finished', () => {
    const { result } = renderHook(() => useMotion());
    act(() => prefs().setReduceMotion('on'));
    act(() => prefs().setReduceMotion('off'));
    expect(result.current.heatmapReveal(0, 0)).toBeNull();
    expect(result.current.staggerIn(0)).toBeNull();
    // Event-driven presets (not entrances) come straight back.
    expect(result.current.pulse(true)).not.toBeNull();
  });

  it('sweeps the heatmap reveal across columns, then down rows', () => {
    expect(heatmapRevealDelay(1, 0)).toBeGreaterThan(heatmapRevealDelay(0, 0));
    expect(heatmapRevealDelay(0, 1)).toBeGreaterThan(heatmapRevealDelay(0, 0));
    expect(heatmapRevealDelay(0, 6)).toBeLessThan(heatmapRevealDelay(3, 0));
  });

  it('pushes pages in the direction of travel and always leaves the same way', () => {
    expect(layoutMotion.push.forward).not.toBe(layoutMotion.push.back);
    expect(layoutMotion.push.out).toBeDefined();
  });
});

describe('heatmap reveal parity', () => {
  const grid = buildLevelGrid(4, 7, (c, r) => ((c + r) % 5) as 0 | 1 | 2 | 3 | 4);
  const revealIn = (scheme: 'light' | 'dark') => {
    const { UNSAFE_getAllByType, unmount } = renderInScheme(
      <Heatmap grid={grid} cellSize={20} animateIn />,
      scheme,
    );
    // HeatCell is memoised; `.type` is the component inside the memo wrapper.
    const appear = UNSAFE_getAllByType(HeatCell.type).map(({ props }) => props.appear);
    unmount();
    return appear;
  };

  it('reveals light and dark with the very same animation: only the colours differ', () => {
    const light = revealIn('light');
    expect(light.every(Boolean)).toBe(true);
    // Same keyframes, timing, curve and delays, cell for cell.
    expect(revealIn('dark')).toEqual(light);
  });

  it('never animates a colour, so it reads the same on a light card as on a dark one', () => {
    const { animationName } = heatmapReveal(0, 0);
    const properties = Object.values(animationName.cssRules).flatMap((frame) => Object.keys(frame));
    expect(new Set(properties)).toEqual(new Set(['opacity', 'transform']));
  });

  it('shows the finished heatmap at once with Reduce Motion, in both themes', () => {
    act(() => prefs().setReduceMotion('on'));
    for (const scheme of SCHEMES) expect(revealIn(scheme).every((appear) => !appear)).toBe(true);
  });

  it('the logo mark arrives with the same reveal as the heatmap it is drawn from', () => {
    const { UNSAFE_getAllByType } = renderInScheme(<LogoMark animateIn />, 'light');
    const appear = UNSAFE_getAllByType(HeatCell.type).map(({ props }) => props.appear);
    expect(appear).toHaveLength(9);
    expect(appear[4]).toEqual(heatmapReveal(1, 1));
  });
});

describe('ScreenTransition', () => {
  const pageOf = () =>
    screen.UNSAFE_root.findAll((node) => node.props.exiting === layoutMotion.push.out, { deep: true })[0];
  const page = (index: number) => (
    <ScreenTransition index={index}>
      <Text>{`Page ${index}`}</Text>
    </ScreenTransition>
  );

  it('turns the step order into pushForward and pushBack; the latest page wins', () => {
    const { rerender } = render(page(1));
    expect(screen.getByText('Page 1')).toBeTruthy();

    rerender(page(2));
    expect(pageOf()?.props.entering).toBe(layoutMotion.push.forward);
    expect(screen.queryByText('Page 1')).toBeNull();

    rerender(page(1));
    expect(pageOf()?.props.entering).toBe(layoutMotion.push.back);

    // Rapid Continue / Back / Continue: each change starts from what is on screen.
    rerender(page(2));
    rerender(page(1));
    rerender(page(2));
    expect(pageOf()?.props.entering).toBe(layoutMotion.push.forward);
    expect(screen.getByText('Page 2')).toBeTruthy();
  });
});

describe('selection', () => {
  function Probe({ selected }: { selected: boolean }) {
    return <Animated.View testID="probe" style={useSelectionMotion(selected)} />;
  }
  const scaleOf = () => {
    const [transform] = getAnimatedStyle(screen.getByTestId('probe')).transform as { scale: number }[];
    return transform?.scale;
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays still on first render, swells when chosen, dips when released, and always settles', () => {
    const { rerender } = render(<Probe selected />);
    expect(scaleOf()).toBe(1);

    rerender(<Probe selected={false} />);
    act(() => jest.advanceTimersByTime(motion.selection.riseMs));
    expect(scaleOf()).toBeLessThan(1);
    act(() => jest.advanceTimersByTime(1000));
    expect(scaleOf()).toBe(1);

    rerender(<Probe selected />);
    act(() => jest.advanceTimersByTime(motion.selection.riseMs));
    expect(scaleOf()).toBeGreaterThan(1);
  });

  it('is interruptible: rapid select / deselect never queues and ends at rest', () => {
    const { rerender } = render(<Probe selected={false} />);
    for (const selected of [true, false, true, false, true]) {
      rerender(<Probe selected={selected} />);
      act(() => jest.advanceTimersByTime(30));
    }
    act(() => jest.advanceTimersByTime(motion.selection.riseMs + motion.selection.settleMs + 50));
    expect(scaleOf()).toBe(1);
  });

  it('does not move with Reduce Motion', () => {
    act(() => prefs().setReduceMotion('on'));
    const { rerender } = render(<Probe selected={false} />);
    rerender(<Probe selected />);
    act(() => jest.advanceTimersByTime(motion.selection.riseMs));
    expect(scaleOf()).toBe(1);
  });

  it.each(SCHEMES)('a selectable tile in %s reports its choice at once', (scheme) => {
    const onPress = jest.fn();
    renderInScheme(
      <SelectableTile
        label="Walk"
        icon={null}
        selected={false}
        accentColor="#1E9A52"
        onPress={onPress}
        accessibilityRole="checkbox"
      />,
      scheme,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('press and hold (the login mark)', () => {
  const { hold } = motion;
  const cellsAppear = () => screen.UNSAFE_getAllByType(HeatCell.type).map(({ props }) => props.appear);
  let charge: jest.SpyInstance;
  let success: jest.SpyInstance;
  let play: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // Spied before render: the mark hands these to its hold as it renders.
    charge = jest.spyOn(haptics, 'charge');
    success = jest.spyOn(haptics, 'success');
    play = jest.spyOn(sounds, 'play');
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a tap is one light tick, and nothing flips', () => {
    renderInScheme(<LogoMark holdable />, 'light');
    const mark = screen.getByTestId('logo-mark', { includeHiddenElements: true });
    fireEvent(mark, 'pressIn');
    act(() => jest.advanceTimersByTime(80));
    fireEvent(mark, 'pressOut');
    act(() => jest.advanceTimersByTime(hold.chargeMs * 2));
    expect(charge).toHaveBeenCalledTimes(1);
    expect(charge).toHaveBeenCalledWith(0);
    expect(success).not.toHaveBeenCalled();
    expect(cellsAppear().every((appear) => !appear)).toBe(true);
  });

  it('held long enough: ticks come faster and harder, then it flips and its blocks stack back in', () => {
    renderInScheme(<LogoMark holdable />, 'dark');
    fireEvent(screen.getByTestId('logo-mark', { includeHiddenElements: true }), 'pressIn');
    act(() => jest.advanceTimersByTime(hold.chargeMs + 50));

    const strengths = charge.mock.calls.map(([progress]) => progress as number);
    expect(strengths.length).toBeGreaterThan(6);
    expect([...strengths].sort((a, b) => a - b)).toEqual(strengths);
    expect(strengths.at(-1)).toBeGreaterThan(0.75);
    expect(success).toHaveBeenCalledTimes(1);
    // The flip is heard as it starts: one sound, the whoosh and then the blocks' wooden clacks.
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('logoFlip');

    const impact = jest.spyOn(haptics, 'impact');
    // Mid-flip, past the edge-on turn: the new face is stacking in, diagonal by diagonal.
    act(() => jest.advanceTimersByTime(hold.flipMs));
    const appear = cellsAppear();
    expect(appear[0]).toEqual(heatmapStack(0, 0, 5));
    expect(appear[4]).toEqual(heatmapStack(1, 1, 5));
    expect(appear[8]).toEqual(heatmapStack(2, 2, 5));

    act(() => jest.advanceTimersByTime(600));
    // A tick on each of the five diagonals' landings, the last one firmer.
    expect(impact).toHaveBeenCalledTimes(5);
    expect(impact).toHaveBeenLastCalledWith('medium');
    // Landed and at rest: animations dropped (nothing replays).
    expect(cellsAppear().every((cellAppear) => !cellAppear)).toBe(true);
  });

  it('letting go early settles back without a flip', () => {
    renderInScheme(<LogoMark holdable />, 'light');
    const mark = screen.getByTestId('logo-mark', { includeHiddenElements: true });
    fireEvent(mark, 'pressIn');
    act(() => jest.advanceTimersByTime(hold.chargeMs / 2));
    fireEvent(mark, 'pressOut');
    const ticks = charge.mock.calls.length;
    act(() => jest.advanceTimersByTime(hold.chargeMs * 2));
    expect(charge.mock.calls.length).toBe(ticks);
    expect(success).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  it('with Reduce Motion the hold still completes and the mark is redrawn, without moving', () => {
    act(() => prefs().setReduceMotion('on'));
    renderInScheme(<LogoMark holdable />, 'light');
    fireEvent(screen.getByTestId('logo-mark', { includeHiddenElements: true }), 'pressIn');
    act(() => jest.advanceTimersByTime(hold.chargeMs + 50));
    expect(success).toHaveBeenCalledTimes(1);
    // Nothing moves, so nothing is narrated: no whoosh, no clacks.
    expect(play).not.toHaveBeenCalled();
    expect(cellsAppear().every((appear) => !appear)).toBe(true);
  });
});
