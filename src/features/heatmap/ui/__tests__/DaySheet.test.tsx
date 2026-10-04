import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { Workout, WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { DaySheet } from '../DaySheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();
const DAY = '2026-09-30' as ISODate;
const TODAY = '2026-10-02' as ISODate;
// Five earlier training days: the median is 3,900 kg.
const WINDOW = [3000, 3500, 3900, 4200, 4500];

const recorded = (over: Partial<WorkoutDay> = {}): WorkoutDay => ({
  date: DAY,
  volumeKg: 4820,
  sets: 14,
  workouts: 1,
  level: 3,
  ...over,
});

const push: WorkoutSummary = {
  id: 'w1',
  name: 'Push Day',
  date: DAY,
  startedAt: new Date(2026, 8, 30, 18, 20).toISOString(),
  durationSeconds: 62 * 60,
  volumeKg: 4820,
  sets: 14,
  reps: 112,
  exercises: [{ name: 'Bench Press (Barbell)', sets: 4 }],
  dayLevel: 3,
};

const running: Workout = {
  id: 'live',
  name: 'Leg Day',
  routineId: 'legs',
  date: TODAY,
  startedAt: new Date(2026, 9, 2, 19, 5).toISOString(),
  endedAt: null,
  bodyweightKg: 70,
  exercises: [],
};

function open(
  date: ISODate | null,
  {
    days = [recorded()] as WorkoutDay[],
    window = WINDOW,
    workouts = [push] as WorkoutSummary[],
    active = null as Workout | null,
    prepare = (_repositories: Repositories) => undefined as void,
  } = {},
) {
  const repositories = createFakeRepositories();
  repositories.workoutDays.list.mockResolvedValue(days);
  repositories.workoutDays.windowBefore.mockResolvedValue(window);
  repositories.workouts.historyBetween.mockResolvedValue(workouts);
  repositories.workouts.active.mockResolvedValue(active);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<DaySheet date={date} />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useSelectedDayStore.setState({ day: null });
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('a training day', () => {
  it('names the day, its level, and its volume against the 90 days before it', async () => {
    open(DAY);

    expect(await screen.findByText('Strong')).toBeTruthy();
    expect(screen.getByText('Wed, 30 Sep')).toBeTruthy();
    expect(screen.getByText('4,820 kg · your 90-day median is 3,900 kg')).toBeTruthy();
  });

  it('reads the level the day was recorded at, and the window it was judged against', async () => {
    const { repositories } = open(DAY);
    await screen.findByText('Strong');

    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', DAY, DAY);
    expect(repositories.workoutDays.windowBefore).toHaveBeenCalledWith('user-1', DAY);
  });

  it('lists its workouts, and opens one in place of the sheet', async () => {
    open(DAY);

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.getByText('18:20 · 62 min · 14 sets')).toBeTruthy();

    fireEvent.press(screen.getByTestId('day-workout-w1'));
    expect(actions.openSession).toHaveBeenCalledWith('w1', { replace: true });
  });

  it('does not compare a day logged before there were five earlier training days', async () => {
    open(DAY, { days: [recorded({ level: 2 })], window: [3900, 4100] });

    expect(await screen.findByText('Moderate')).toBeTruthy();
    expect(screen.getByText('4,820 kg · too early to compare')).toBeTruthy();
  });

  it('counts the sets of a day that moved no weight', async () => {
    open(DAY, { days: [recorded({ level: 1, volumeKg: 0, sets: 3 })] });

    expect(await screen.findByText('Light')).toBeTruthy();
    expect(screen.getByText('3 sets · no weight lifted')).toBeTruthy();
  });
});

describe('a day from an earlier year', () => {
  it('is titled with its year', async () => {
    open('2025-09-30' as ISODate, { days: [recorded({ date: '2025-09-30' as ISODate })], workouts: [] });

    expect(await screen.findByText('Tue, 30 Sep 2025')).toBeTruthy();
  });
});

describe('a day without training', () => {
  it('is a rest day, said in a word, with no list', async () => {
    open('2026-09-29' as ISODate, { days: [], workouts: [] });

    expect(await screen.findByText('No workout')).toBeTruthy();
    expect(screen.getByText('Rest day')).toBeTruthy();
    expect(screen.queryByText('WORKOUTS')).toBeNull();
  });

  it('is "Nothing logged yet" today', async () => {
    open(TODAY, { days: [], workouts: [] });

    expect(await screen.findByText('Nothing logged yet')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });
});

describe('today, with a workout running', () => {
  it('says the workout counts once finished, rather than calling today a rest day', async () => {
    open(TODAY, { days: [], workouts: [], active: running });

    expect(await screen.findByText('Counts when you finish')).toBeTruthy();
    expect(screen.getByText('In progress · started 19:05')).toBeTruthy();
  });

  it('offers the way back to it', async () => {
    open(TODAY, { days: [], workouts: [], active: running });

    fireEvent.press(await screen.findByTestId('day-in-progress'));

    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });
});

describe('the sheet itself', () => {
  it('opens today for a link that is not a day', async () => {
    const { repositories } = open(null, { days: [], workouts: [] });

    expect(await screen.findByText('Nothing logged yet')).toBeTruthy();
    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', TODAY, TODAY);
  });

  it('opens today for a day that has not happened yet', async () => {
    const { repositories } = open('2026-12-25' as ISODate, { days: [], workouts: [] });

    expect(await screen.findByText('Nothing logged yet')).toBeTruthy();
    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', TODAY, TODAY);
  });

  it('rings its day on the wave while it is open, and lets go when it closes', async () => {
    const { unmount } = open(DAY);
    await screen.findByText('Strong');

    expect(useSelectedDayStore.getState().day).toBe(DAY);
    unmount();
    expect(useSelectedDayStore.getState().day).toBeNull();
  });

  it('closes', async () => {
    open(DAY);

    fireEvent.press(await screen.findByLabelText('Close'));

    expect(actions.goBack).toHaveBeenCalled();
  });

  it('says briefly when the day could not be read, and tries again', async () => {
    open(DAY, {
      prepare: (fakes) =>
        void fakes.workoutDays.list.mockRejectedValueOnce(new Error('disk')).mockResolvedValue([recorded()]),
    });

    expect(await screen.findByText("Couldn't load this day")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Strong')).toBeTruthy();
  });
});
