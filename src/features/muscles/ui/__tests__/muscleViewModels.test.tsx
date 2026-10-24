import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import { createFakeRepositories } from '@test/fakes/fakeRepositories';
import { MUSCLE_OF_GROUP, TODAY, wholeBody, workout } from '@test/fakes/muscleRows';
import { createWrapper } from '@test/providers';

import { useMuscleBalance } from '../useMuscleBalance';
import { useMuscleHistory } from '../useMuscleHistory';
import { useMusclesThisWeek } from '../useMusclesThisWeek';

jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-22' }));

function setup(rows: MuscleSetRow[] | Error) {
  const repositories = createFakeRepositories();
  if (rows instanceof Error) repositories.workouts.muscleSets.mockRejectedValue(rows);
  else repositories.workouts.muscleSets.mockResolvedValue(rows);
  const { Wrapper } = createWrapper(repositories);
  return { repositories, Wrapper };
}

describe('the one read the three cards share', () => {
  it('asks once, for the last 8 weeks up to today, however many cards are showing', async () => {
    const { repositories, Wrapper } = setup([]);
    const { result } = renderHook(
      () => ({ week: useMusclesThisWeek(), history: useMuscleHistory(), balance: useMuscleBalance() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.week.status).toBe('ready'));

    expect(repositories.workouts.muscleSets).toHaveBeenCalledTimes(1);
    expect(repositories.workouts.muscleSets).toHaveBeenCalledWith(null, '2026-08-28', TODAY);
    expect(result.current.history.status).toBe('ready');
    expect(result.current.balance.status).toBe('ready');
  });
});

describe("Home's muscles this week", () => {
  it("tiers each group by this week's hits and counts those hit twice", async () => {
    const { Wrapper } = setup([
      ...workout('mon', '2026-10-19', ['chest', 'quads', 'calves']),
      ...workout('wed', '2026-10-21', ['chest', 'quads']),
      // Last week's work doesn't count towards this one.
      ...workout('old', '2026-10-17', ['calves', 'abs']),
    ]);
    const { result } = renderHook(() => useMusclesThisWeek(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.tiers).toMatchObject({ chest: 2, quads: 2, calves: 1, core: 0, back: 0 });
    expect(result.current.line).toBe('2 of 10 muscles hit twice');
    expect(result.current.showBanner).toBe(false);
    expect(result.current.accessibilityLabel).toContain('2 of 10 muscles hit twice');
  });

  it('shows the banner only when all ten are twice, and puts it away for the week when closed', async () => {
    const nine = [...wholeBody('a', '2026-10-19'), ...workout('b', '2026-10-20', MUSCLE_OF_GROUP.slice(1))];
    const ten = [...wholeBody('a', '2026-10-19'), ...wholeBody('b', '2026-10-20')];

    const short = renderHook(() => useMusclesThisWeek(), { wrapper: setup(nine).Wrapper });
    await waitFor(() => expect(short.result.current.status).toBe('ready'));
    expect(short.result.current.line).toBe('9 of 10 muscles hit twice');
    expect(short.result.current.showBanner).toBe(false);

    const full = renderHook(() => useMusclesThisWeek(), { wrapper: setup(ten).Wrapper });
    await waitFor(() => expect(full.result.current.showBanner).toBe(true));
    expect(full.result.current.line).toBe('10 of 10 muscles hit twice');

    act(() => full.result.current.onDismissBanner());
    expect(full.result.current.showBanner).toBe(false);
    expect(full.result.current.line).toBe('10 of 10 muscles hit twice');
  });

  it('draws nothing hit and no banner while loading, and says so when it cannot load', async () => {
    const { Wrapper } = setup([]);
    const loading = renderHook(() => useMusclesThisWeek(), { wrapper: Wrapper });

    expect(loading.result.current).toMatchObject({ status: 'loading', line: 'Loading…', showBanner: false });
    expect(Object.values(loading.result.current.tiers)).toEqual(new Array(10).fill(0));
    expect(loading.result.current.accessibilityLabel).toBe('Muscles this week, loading.');
    await waitFor(() => expect(loading.result.current.status).toBe('ready'));

    const failed = renderHook(() => useMusclesThisWeek(), { wrapper: setup(new Error('disk')).Wrapper });
    await waitFor(() => expect(failed.result.current.status).toBe('error'));
    expect(failed.result.current.line).toBe("Couldn't load this week");
    expect(failed.result.current.showBanner).toBe(false);
    expect(failed.result.current.accessibilityLabel).toBe('Muscles this week, could not be loaded.');
  });
});

describe("Profile's muscle history", () => {
  it('lists the last two weeks, a muscle per row in two columns of five', async () => {
    const { Wrapper } = setup([
      ...workout('l1', '2026-10-13', ['chest', 'quads']),
      ...workout('l2', '2026-10-15', ['chest']),
      ...workout('t1', '2026-10-20', ['chest', 'calves']),
    ]);
    const { result } = renderHook(() => useMuscleHistory(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const [left, right] = result.current.columns;
    expect(left.map((row) => row.label)).toEqual(['Chest', 'Shoulders', 'Biceps', 'Triceps', 'Core']);
    expect(right.map((row) => row.label)).toEqual(['Quads', 'Calves', 'Hamstrings', 'Glutes', 'Back']);
    expect(left[0]).toMatchObject({ tiers: [2, 1], behind: true });
    expect(right[0]).toMatchObject({ tiers: [1, 0], behind: true });
    expect(right[1]).toMatchObject({ tiers: [0, 1], behind: true });
  });

  it('flags only the muscles behind this week, and counts the complete weeks', async () => {
    const { Wrapper } = setup([
      ...wholeBody('l1', '2026-10-13'),
      ...wholeBody('l2', '2026-10-14'),
      ...wholeBody('t1', '2026-10-19'),
      ...workout('t2', '2026-10-20', MUSCLE_OF_GROUP.slice(0, 9)),
    ]);
    const { result } = renderHook(() => useMuscleHistory(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const behind = result.current.columns.flat().filter((row) => row.behind);
    expect(behind.map((row) => row.label)).toEqual(['Back']);
    expect(result.current.weeksTwice).toBe(1);
    expect(result.current.goal).toEqual([true, false]);
    expect(result.current.weeksShown).toBe(2);
    expect(result.current.accessibilityLabel).toContain('Every muscle twice in 1 of 2 weeks');
    expect(result.current.accessibilityLabel).toContain('Behind this week: Back.');
  });

  it('keeps its rows, flags none and notes the failure while it cannot load', async () => {
    const loading = renderHook(() => useMuscleHistory(), { wrapper: setup([]).Wrapper });
    expect(loading.result.current.status).toBe('loading');
    expect(loading.result.current.columns.flat()).toHaveLength(10);
    expect(loading.result.current.columns.flat().some((row) => row.behind)).toBe(false);
    await waitFor(() => expect(loading.result.current.status).toBe('ready'));

    const failed = renderHook(() => useMuscleHistory(), { wrapper: setup(new Error('disk')).Wrapper });
    await waitFor(() => expect(failed.result.current.status).toBe('error'));
    expect(failed.result.current.note).toBe("Couldn't load your muscle history");
    expect(failed.result.current.columns.flat()).toHaveLength(10);
  });

  it('works the history out once per change of the data, not per render', async () => {
    const { Wrapper } = setup(wholeBody('t1', '2026-10-20'));
    const { result, rerender } = renderHook(() => useMuscleHistory(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const columns = result.current.columns;

    rerender({});

    expect(result.current.columns).toBe(columns);
  });
});

describe("Profile's muscle balance", () => {
  it('draws the last 4 weeks against the 4 before, with the biggest gain and what needs work', async () => {
    const { Wrapper } = setup([
      ...workout('n1', '2026-10-20', ['chest'], 10),
      ...workout('n2', '2026-09-25', ['chest', 'lats'], 4),
      ...workout('b1', '2026-09-24', ['chest'], 6),
      ...workout('b2', '2026-08-28', ['lats'], 6),
    ]);
    const { result } = renderHook(() => useMuscleBalance(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.empty).toBe(false);
    expect(result.current.now.split(' ')).toHaveLength(10);
    expect(result.current.before.split(' ')).toHaveLength(10);
    expect(result.current.now).not.toBe(result.current.before);
    expect(result.current.tiles).toEqual([
      { label: 'Biggest gain', name: 'Chest', sub: '+8 sets', tone: 'accent' },
      { label: 'Needs work', name: 'Shoulders', sub: '0 sets', tone: 'secondary' },
    ]);
    expect(result.current.note).toBeNull();
  });

  it('works the shapes out once per change of the data, not per render', async () => {
    const { Wrapper } = setup(wholeBody('n1', '2026-10-20'));
    const { result, rerender } = renderHook(() => useMuscleBalance(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const tiles = result.current.tiles;

    rerender({});

    expect(result.current.tiles).toBe(tiles);
  });

  it('has no web to draw when nothing was completed, and says how to get one', async () => {
    const { Wrapper } = setup([]);
    const { result } = renderHook(() => useMuscleBalance(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current).toMatchObject({ empty: true, now: '', before: '', tiles: [] });
  });

  it('holds the tiles while loading and notes the failure when it cannot load', async () => {
    const loading = renderHook(() => useMuscleBalance(), { wrapper: setup([]).Wrapper });
    expect(loading.result.current).toMatchObject({ status: 'loading', empty: false, now: '', before: '' });
    expect(loading.result.current.tiles).toHaveLength(2);
    await waitFor(() => expect(loading.result.current.status).toBe('ready'));

    const failed = renderHook(() => useMuscleBalance(), { wrapper: setup(new Error('disk')).Wrapper });
    await waitFor(() => expect(failed.result.current.status).toBe('error'));
    expect(failed.result.current).toMatchObject({
      empty: false,
      tiles: [],
      note: "Couldn't load your muscle balance",
    });
  });
});
