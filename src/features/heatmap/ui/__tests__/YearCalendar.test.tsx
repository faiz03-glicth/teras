import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { MonthDaysScreen } from '../MonthDaysScreen';
import { YearMonthsScreen } from '../YearMonthsScreen';
import { YearsScreen } from '../YearsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-12' }));

const initialAuth = useAuthStore.getState();

const day = (date: string, level: WorkoutDay['level'], workouts = 1): WorkoutDay => ({
  date: date as ISODate,
  level,
  volumeKg: 4000,
  sets: 12,
  workouts,
});

/** Fakes that answer each range with only the days inside it, as SQLite would. */
function render(
  ui: React.ReactElement,
  {
    days = [] as WorkoutDay[],
    streak = [] as string[],
    years = [] as number[],
    streakYears = [] as number[],
  } = {},
) {
  const repositories = createFakeRepositories();
  repositories.workoutDays.years.mockResolvedValue(years);
  repositories.streakDays.years.mockResolvedValue(streakYears);
  repositories.workoutDays.list.mockImplementation(async (_owner: unknown, from: string, to: string) =>
    days.filter((one) => one.date >= from && one.date <= to),
  );
  repositories.streakDays.list.mockImplementation(async (_owner: unknown, from: string, to: string) =>
    streak.filter((date) => date >= from && date <= to),
  );
  const { Wrapper } = createWrapper(repositories);
  return { ...renderInScheme(ui, 'light', { wrapper: Wrapper }), repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useSelectedDayStore.setState({ day: null });
  });
});

describe('Level 1, the years', () => {
  it('lists each year newest first with its counts, and a tap opens its months', async () => {
    const { repositories } = render(<YearsScreen />, {
      years: [2026, 2021],
      days: [day('2026-10-01', 3, 2), day('2021-03-04', 2)],
      streak: ['2026-10-05'],
    });

    expect(await screen.findByLabelText('2026, this year, 2 workouts · 1 no details')).toBeTruthy();
    expect(await screen.findByLabelText('2021, 1 workout')).toBeTruthy();
    // Each card reads only its own year.
    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', '2021-01-01', '2021-12-31');
    expect(repositories.workoutDays.list).not.toHaveBeenCalledWith('user-1', '2000-01-01', expect.anything());

    fireEvent.press(screen.getByTestId('calendar-year-2021'));
    expect(actions.openCalendarYear).toHaveBeenCalledWith(2021);
  });

  it('shows the locked card with one year, and its key opens last year', async () => {
    render(<YearsScreen />, { years: [2026], days: [day('2026-10-01', 3)] });

    expect(await screen.findByText('Your years show here')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/So far, 2026 only · 1 workout\./)).toBeTruthy());
    expect(screen.queryByTestId('calendar-year-2026')).toBeNull();

    fireEvent.press(screen.getByTestId('calendar-locked-log'));
    expect(actions.openCalendarYear).toHaveBeenCalledWith(2025);
  });

  it('counts a year that only has Streak check-ins', async () => {
    render(<YearsScreen />, { years: [2026], streakYears: [2024], streak: ['2024-05-05'] });

    expect(await screen.findByLabelText('2024, 1 no details')).toBeTruthy();
  });
});

describe('Level 2, the months', () => {
  it('counts each month, opens a past one, and leaves a month to come untappable', async () => {
    render(<YearMonthsScreen year={2026} />, {
      days: [day('2026-09-02', 2), day('2026-09-09', 4)],
      streak: ['2026-08-01'],
    });

    expect(await screen.findByLabelText('September, 2 workouts')).toBeTruthy();
    expect(screen.getByLabelText('August, 1 no details')).toBeTruthy();
    expect(screen.getByLabelText('October, this month, Nothing')).toBeTruthy();
    expect(screen.getByLabelText('November, not yet')).toBeTruthy();

    fireEvent.press(screen.getByTestId('calendar-month-9'));
    expect(actions.openCalendarMonth).toHaveBeenCalledWith(2026, 8);
    fireEvent.press(screen.getByTestId('calendar-month-11'));
    expect((actions.openCalendarMonth as jest.Mock).mock.calls).toEqual([[2026, 8]]);
  });
});

describe('while a Calendar page slides in', () => {
  // A picture is hidden from screen readers (nothing in it to read), so these look past that, or a
  // count of none would pass for the wrong reason.
  const PICTURES = { includeHiddenElements: true } as const;

  afterEach(() => jest.mocked(actions.useScreenSettled).mockReturnValue(true));

  it('builds a screenful of years with their strips held back, and the rest once it has settled', async () => {
    jest.mocked(actions.useScreenSettled).mockReturnValue(false);
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];
    const view = render(<YearsScreen />, { years, days: years.map((year) => day(`${year}-03-04`, 2)) });

    expect(await screen.findByTestId('calendar-year-2021')).toBeTruthy();
    expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(6);
    expect(screen.getAllByTestId('heat-paths-held')).toHaveLength(6);
    expect(screen.queryAllByTestId('heat-paths', PICTURES)).toHaveLength(0);

    jest.mocked(actions.useScreenSettled).mockReturnValue(true);
    view.rerender(<YearsScreen />);

    expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(8);
    expect(screen.queryAllByTestId('heat-paths-held')).toHaveLength(0);
    expect(screen.getAllByTestId('heat-paths', PICTURES).length).toBeGreaterThanOrEqual(6);
  });

  it("draws a year's twelve month pictures once it has slid in, keeping their room meanwhile", async () => {
    jest.mocked(actions.useScreenSettled).mockReturnValue(false);
    const view = render(<YearMonthsScreen year={2026} />, { days: [day('2026-09-02', 2)] });

    expect(await screen.findByLabelText('September, 1 workout')).toBeTruthy();
    expect(screen.getAllByTestId('heat-paths-held')).toHaveLength(12);
    expect(screen.queryAllByTestId('heat-paths', PICTURES)).toHaveLength(0);

    jest.mocked(actions.useScreenSettled).mockReturnValue(true);
    view.rerender(<YearMonthsScreen year={2026} />);

    expect(screen.getAllByTestId('heat-paths', PICTURES)).toHaveLength(12);
    expect(screen.queryAllByTestId('heat-paths-held')).toHaveLength(0);
  });
});

describe('Level 3, the days', () => {
  it('names each day by its look and opens its sheet; days to come are not buttons', async () => {
    render(<MonthDaysScreen year={2026} month={9} />, {
      days: [day('2026-10-01', 4)],
      streak: ['2026-10-03'],
    });

    expect(await screen.findByLabelText('1: Peak')).toBeTruthy();
    expect(screen.getByLabelText('3: Logged, no details')).toBeTruthy();
    expect(screen.getByLabelText('12, today: Nothing logged')).toBeTruthy();
    expect(screen.getByLabelText('13, still to come')).toBeTruthy();
    expect(screen.queryByTestId('calendar-day-2026-10-13')).toBeNull();

    fireEvent.press(screen.getByTestId('calendar-day-2026-10-03'));
    expect(actions.openDay).toHaveBeenCalledWith('2026-10-03');
  });

  it('steps back a month freely but not into a month to come', async () => {
    render(<MonthDaysScreen year={2026} month={9} />);

    expect(await screen.findByText('October')).toBeTruthy();
    expect(screen.getByTestId('calendar-next')).toBeDisabled();
    fireEvent.press(screen.getByTestId('calendar-next'));
    expect(actions.showCalendarMonth).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('calendar-prev'));
    await waitFor(() => expect(actions.showCalendarMonth).toHaveBeenCalledWith(2026, 8));
  });

  it('crosses into the year before from January', async () => {
    render(<MonthDaysScreen year={2026} month={0} />);

    expect(await screen.findByText('January')).toBeTruthy();
    fireEvent.press(screen.getByTestId('calendar-prev'));
    await waitFor(() => expect(actions.showCalendarMonth).toHaveBeenCalledWith(2025, 11));
  });
});
