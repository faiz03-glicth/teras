import { act, fireEvent, screen } from '@testing-library/react-native';

import { HERO_GRID } from '@/features/onboarding/config/heroPattern';
import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { heatmapFall, heatmapStack } from '@/theme/motion/cssMotion';
import { rebuildMs, rebuildStartMs } from '@/theme/motion/heatmapRebuild';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';
import { motion } from '@/theme/tokens/motion';
import { renderInScheme } from '@test/render';

import { HeatCell } from '../HeatCell';
import { HoldableHeatmap } from '../HoldableHeatmap';

const { hold, heatmapRebuild: rebuild } = motion;
const COLUMNS = HERO_GRID.columns.length;
const ROWS = 7;
const DIAGONALS = COLUMNS + ROWS - 1;

const prefs = () => useThemePreferencesStore.getState();
const cellsAppear = () => screen.UNSAFE_getAllByType(HeatCell.type).map(({ props }) => props.appear);
const heatmap = () => screen.getByTestId('holdable-heatmap', { includeHiddenElements: true });
/** Holds until the charge is full (the hold motion's own timer), then lets go. */
const holdUntilCharged = () => {
  fireEvent(heatmap(), 'pressIn');
  act(() => jest.advanceTimersByTime(hold.chargeMs + 20));
  fireEvent(heatmap(), 'pressOut');
};

let play: jest.SpyInstance;
let impact: jest.SpyInstance;
let success: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  act(() => prefs().setReduceMotion('off'));
  play = jest.spyOn(sounds, 'play').mockImplementation(() => undefined);
  jest.spyOn(sounds, 'preload').mockImplementation(() => undefined);
  impact = jest.spyOn(haptics, 'impact');
  success = jest.spyOn(haptics, 'success');
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('HoldableHeatmap (the Welcome hero)', () => {
  it('held long enough: collapses bottom row first with the falling sound and a thud per impact', () => {
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} animateIn />, 'light');
    holdUntilCharged();

    expect(play).toHaveBeenCalledWith('heatmapCollapse');
    // Every block falls, on its row's impact (cell 6 is the bottom of the first column).
    const appear = cellsAppear();
    expect(appear).toHaveLength(COLUMNS * ROWS);
    expect(appear[6]).toEqual(heatmapFall(0, 6, ROWS));
    expect(appear[0]).toEqual(heatmapFall(0, 0, ROWS));

    act(() => jest.advanceTimersByTime(rebuild.audioLeadMs));
    expect(impact).toHaveBeenCalledWith('heavy');
    act(() => jest.advanceTimersByTime(rebuild.impactsMs.at(-1) ?? 0));
    expect(impact).toHaveBeenCalledTimes(rebuild.impactsMs.length);
  });

  it('then stacks itself back up, diagonal by diagonal, with the stacking sound and a tick per clack', () => {
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} animateIn />, 'dark');
    holdUntilCharged();

    act(() => jest.advanceTimersByTime(rebuildStartMs));
    // The collapse's thuds are over; count only the rebuild's ticks from here.
    impact.mockClear();
    expect(play).toHaveBeenLastCalledWith('heatmapStack');
    const appear = cellsAppear();
    expect(appear[0]).toEqual(heatmapStack(0, 0, DIAGONALS));
    expect(appear.at(-1)).toEqual(heatmapStack(COLUMNS - 1, ROWS - 1, DIAGONALS));

    act(() => jest.advanceTimersByTime(rebuild.audioLeadMs + rebuildMs(COLUMNS, ROWS)));
    // 11 heard landings: every other diagonal, and the last one, a little firmer.
    expect(impact).toHaveBeenCalledTimes(11);
    expect(impact).toHaveBeenLastCalledWith('medium');
    // At rest: every block landed, animations dropped, and the entrance never replays.
    expect(cellsAppear().every((appear) => !appear)).toBe(true);
  });

  it('keeps the same blocks from the collapse through the rebuild (nothing remounts, so nothing flashes)', () => {
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} animateIn />, 'light');
    const before = screen.UNSAFE_getAllByType(HeatCell.type).map((cell) => cell.parent);
    holdUntilCharged();
    act(() => jest.advanceTimersByTime(rebuildStartMs + 10));
    const after = screen.UNSAFE_getAllByType(HeatCell.type).map((cell) => cell.parent);
    expect(after).toHaveLength(before.length);
    after.forEach((parent, index) => expect(parent).toBe(before[index]));
  });

  it('ignores presses while a rebuild plays, and plays again once it is done', () => {
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} animateIn />, 'light');
    holdUntilCharged();
    const charge = jest.spyOn(haptics, 'charge');

    fireEvent(heatmap(), 'pressIn');
    expect(charge).not.toHaveBeenCalled();
    fireEvent(heatmap(), 'pressOut');

    act(() => jest.advanceTimersByTime(rebuildStartMs + rebuild.audioLeadMs + rebuildMs(COLUMNS, ROWS) + 10));
    holdUntilCharged();
    expect(play.mock.calls.filter(([name]) => name === 'heatmapCollapse')).toHaveLength(2);
  });

  it('a tap is only a tick: nothing falls', () => {
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} />, 'light');
    fireEvent(heatmap(), 'pressIn');
    act(() => jest.advanceTimersByTime(80));
    fireEvent(heatmap(), 'pressOut');
    act(() => jest.advanceTimersByTime(3000));
    expect(play).not.toHaveBeenCalled();
    expect(cellsAppear().every((appear) => !appear)).toBe(true);
  });

  it('leaving the screen mid-rebuild stops everything still to come', () => {
    const { unmount } = renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} />, 'light');
    holdUntilCharged();
    unmount();
    impact.mockClear();
    act(() => jest.advanceTimersByTime(5000));
    expect(play).not.toHaveBeenCalledWith('heatmapStack');
    expect(impact).not.toHaveBeenCalled();
  });

  it('with Reduce Motion nothing falls: a completed hold is a success tap, silently', () => {
    act(() => prefs().setReduceMotion('on'));
    renderInScheme(<HoldableHeatmap grid={HERO_GRID} cellSize={20} gap={5} animateIn />, 'light');
    holdUntilCharged();
    act(() => jest.advanceTimersByTime(5000));
    expect(success).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
    expect(cellsAppear().every((appear) => !appear)).toBe(true);
  });
});
