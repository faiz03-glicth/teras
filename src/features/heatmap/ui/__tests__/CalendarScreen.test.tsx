import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { CalendarScreen } from '../CalendarScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const workout = (id: string, date: string, over: Partial<WorkoutSummary> = {}): WorkoutSummary => ({
  id,
  name: 'Push Day',
  date: date as ISODate,
  startedAt: `${date}T10:00:00.000Z`,
  durationSeconds: 62 * 60,
  volumeKg: 4820,
  sets: 14,
  exercises: [],
  dayLevel: 3,
  ...over,
});

const day = (date: string, level: WorkoutDay['level']): WorkoutDay => ({
  date: date as ISODate,
  level,
  volumeKg: 4820,
  sets: 14,
  workouts: 1,
});

function calendar({
  workouts = [] as WorkoutSummary[],
  days = [] as WorkoutDay[],
  prepare = (_repositories: Repositories) => undefined as void,
} = {}) {
  const repositories = createFakeRepositories();
  repositories.workouts.historyBetween.mockResolvedValue(workouts);
  repositories.workoutDays.list.mockResolvedValue(days);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<CalendarScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

// The month list (a VirtualizedList) renders its rows on a timer a moment after its data lands. With fake
// timers, the queries' waits advance that timer inside act, and nothing is left to fire after a test.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useSelectedDayStore.setState({ day: null });
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('the month lists', () => {
  it('groups workouts by month, newest month first, each with how many it holds', async () => {
    calendar({
      workouts: [
        workout('a', '2026-09-30'),
        workout('b', '2026-09-28', { name: 'Pull Day' }),
        workout('c', '2026-08-31', { name: 'Leg Day' }),
      ],
    });

    expect(await screen.findByText('SEPTEMBER · 2 WORKOUTS')).toBeTruthy();
    expect(screen.getByText('AUGUST · 1 WORKOUT')).toBeTruthy();
    expect(screen.getAllByTestId(/^calendar-month-/).map((month) => month.props.testID)).toEqual([
      'calendar-month-2026-8',
      'calendar-month-2026-7',
    ]);
  });

  it('names the year of a month from an earlier year', async () => {
    calendar({ workouts: [workout('a', '2025-09-12')], days: [day('2025-09-12', 2)] });

    expect(await screen.findByText('SEPTEMBER 2025 · 1 WORKOUT')).toBeTruthy();
  });

  it("puts each workout under its own day: when, how long, how much, and the day's level", async () => {
    calendar({ workouts: [workout('a', '2026-09-28')] });

    expect(await screen.findByText('Mon, 28 Sep · 62 min · 4,820 kg · Strong')).toBeTruthy();
  });

  it('opens the workout that was chosen', async () => {
    calendar({ workouts: [workout('a', '2026-09-30'), workout('b', '2026-09-28')] });

    fireEvent.press(await screen.findByTestId('calendar-workout-b'));

    expect(actions.openSession).toHaveBeenCalledWith('b');
  });

  it('reads the whole history at once, to today', async () => {
    const { repositories } = calendar();

    await waitFor(() => expect(repositories.workouts.historyBetween).toHaveBeenCalled());
    expect(repositories.workouts.historyBetween).toHaveBeenCalledWith('user-1', '2000-01-01', '2026-10-02');
  });
});

describe('the full wave', () => {
  it("starts with Home's three months and reaches back to the first training day", async () => {
    calendar({ days: [day('2026-02-10', 2)], workouts: [workout('a', '2026-02-10')] });

    expect(await screen.findByRole('button', { name: 'Feb 10: Moderate' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Oct 2, today: No workout' })).toBeTruthy();
  });

  it('names the year of the months and days of an earlier year', async () => {
    calendar({ days: [day('2025-09-12', 2)], workouts: [workout('a', '2025-09-12')] });

    expect(await screen.findByRole('button', { name: 'Sep 12, 2025: Moderate' })).toBeTruthy();
    // Month headings are for the eye only: every day's label already names its month.
    expect(screen.getByText('Sep 2025', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Oct', { includeHiddenElements: true })).toBeTruthy();
  });

  it('rings the day whose detail is open', async () => {
    calendar({ days: [day('2026-09-30', 3)] });
    await screen.findByRole('button', { name: 'Sep 30: Strong' });

    act(() => useSelectedDayStore.getState().select('2026-09-30' as ISODate));

    expect(screen.getByTestId('day-2026-09-30').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('day-2026-10-02').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('opens the day that was tapped', async () => {
    calendar({ days: [day('2026-09-30', 3)] });

    fireEvent.press(await screen.findByRole('button', { name: 'Sep 30: Strong' }));

    expect(actions.openDay).toHaveBeenCalledWith('2026-09-30');
  });

  it('goes back to where it was opened from', async () => {
    calendar();

    fireEvent.press(await screen.findByLabelText('Back'));

    expect(actions.goBack).toHaveBeenCalled();
  });
});

describe('states', () => {
  it('is the wave and a short line when nothing has been logged', async () => {
    calendar();

    expect(await screen.findByText('No workouts yet')).toBeTruthy();
    expect(screen.getByTestId('calendar-wave')).toBeTruthy();
  });

  it('says briefly when workouts could not be read, and tries again', async () => {
    calendar({
      prepare: (fakes) =>
        void fakes.workouts.historyBetween
          .mockRejectedValueOnce(new Error('disk'))
          .mockResolvedValue([workout('a', '2026-09-30')]),
    });

    expect(await screen.findByText("Couldn't load workouts")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('SEPTEMBER · 1 WORKOUT')).toBeTruthy();
  });
});
