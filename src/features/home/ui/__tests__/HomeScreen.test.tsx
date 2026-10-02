import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { Workout, WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { HomeScreen } from '../HomeScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Friday 2 October 2026: the wave shows August to October.
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();
const at = (hour: number, minute: number, date = 2) => new Date(2026, 9, date, hour, minute).toISOString();

const summary = (over: Partial<WorkoutSummary> = {}): WorkoutSummary => ({
  id: 'w1',
  name: 'Push Day',
  date: '2026-10-02' as ISODate,
  startedAt: at(18, 20),
  durationSeconds: 62 * 60,
  volumeKg: 4820,
  sets: 14,
  exercises: [
    { name: 'Bench Press (Barbell)', sets: 4 },
    { name: 'Overhead Press (Barbell)', sets: 4 },
    { name: 'Triceps Pushdown (Cable)', sets: 6 },
    { name: 'Lateral Raise (Dumbbell)', sets: 3 },
  ],
  dayLevel: 3,
  ...over,
});

const day = (date: string, level: WorkoutDay['level'], workouts = 1): WorkoutDay => ({
  date: date as ISODate,
  level,
  volumeKg: 4000,
  sets: 12,
  workouts,
});

const set = (id: string, status: 'done' | 'pending') => ({
  id,
  position: 0,
  weightKg: 100,
  reps: 5,
  seconds: null,
  status,
  setType: 'normal' as const,
  rpe: null,
  note: null,
});

const running = (): Workout => ({
  id: 'live',
  name: 'Leg Day',
  routineId: 'legs',
  date: '2026-10-02' as ISODate,
  startedAt: at(19, 5),
  endedAt: null,
  bodyweightKg: 70,
  exercises: [
    {
      id: 'we1',
      exerciseId: 'squat-barbell',
      name: 'Squat (Barbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [set('s1', 'done'), set('s2', 'pending')],
    },
  ],
});

/** Home over fake repositories; `prepare` adjusts them before the first render. */
function home({
  feed = [] as WorkoutSummary[],
  days = [] as WorkoutDay[],
  active = null as Workout | null,
  prepare = (_repositories: Repositories) => undefined as void,
} = {}) {
  const repositories = createFakeRepositories();
  repositories.workouts.history.mockResolvedValue(feed);
  repositories.workoutDays.list.mockResolvedValue(days);
  repositories.workouts.active.mockResolvedValue(active);
  prepare(repositories);
  const { Wrapper, queryClient } = createWrapper(repositories);
  const view = renderInScheme(<HomeScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories, queryClient };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useSelectedDayStore.setState({ day: null });
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('the training wave', () => {
  it('leads Home, naming its months and how many workouts they hold', async () => {
    home({ days: [day('2026-09-28', 3), day('2026-09-30', 2, 2)] });

    expect(await screen.findByText('Aug – Oct 2026 · 3 workouts')).toBeTruthy();
    expect(screen.getByTestId('training-wave')).toBeTruthy();
    expect(screen.getByText('Training wave')).toBeTruthy();
  });

  it('asks only for the days it draws: the first of August to today', async () => {
    const { repositories } = home();

    await waitFor(() => expect(repositories.workoutDays.list).toHaveBeenCalled());
    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', '2026-08-01', '2026-10-02');
  });

  it("colours each day with the level it was recorded at, and says the level's name", async () => {
    home({ days: [day('2026-09-30', 3)] });

    expect(await screen.findByRole('button', { name: 'Sep 30: Strong' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sep 29: No workout' })).toBeTruthy();
  });

  it('marks today, and leaves the days still to come unopenable', async () => {
    home();

    expect(await screen.findByRole('button', { name: 'Oct 2, today: No workout' })).toBeTruthy();
    expect(screen.queryByTestId('day-2026-10-03')).toBeNull();
  });

  it('opens the day that was tapped', async () => {
    home({ days: [day('2026-09-30', 3)] });

    fireEvent.press(await screen.findByRole('button', { name: 'Sep 30: Strong' }));

    expect(actions.openDay).toHaveBeenCalledWith('2026-09-30');
  });

  it('rings the day whose detail is open', async () => {
    home();
    act(() => useSelectedDayStore.getState().select('2026-09-15' as ISODate));

    const cell = await screen.findByTestId('day-2026-09-15');
    expect(cell.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('opens the Calendar from its header', async () => {
    home();

    fireEvent.press(await screen.findByRole('button', { name: /^Training wave/ }));

    expect(actions.openCalendar).toHaveBeenCalled();
  });
});

describe('the workout feed', () => {
  it('shows each workout scannably: name, level, when, its numbers, its first exercises', async () => {
    home({ feed: [summary()] });

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Strong')).toBeTruthy();
    expect(screen.getByText('Today · 18:20')).toBeTruthy();
    expect(screen.getByText('62 min')).toBeTruthy();
    expect(screen.getByText('4,820 kg')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getAllByText('4 sets')).toHaveLength(2);
    expect(screen.getByText('Triceps Pushdown (Cable)')).toBeTruthy();
    expect(screen.getByText('See 1 more exercise')).toBeTruthy();
    expect(screen.queryByText('Lateral Raise (Dumbbell)')).toBeNull();
  });

  it('keeps the newest workout first, as the repository gives them', async () => {
    home({
      feed: [
        summary({ id: 'newer', name: 'Pull Day' }),
        summary({ id: 'older', name: 'Leg Day', date: '2026-09-29' as ISODate, startedAt: at(7, 10, 29) }),
      ],
    });

    await screen.findByText('Pull Day');
    expect(screen.getAllByTestId(/^feed-/).map((card) => card.props.testID)).toEqual([
      'feed-newer',
      'feed-older',
    ]);
    expect(screen.getByText('Tue, 29 Sep · 07:10')).toBeTruthy();
  });

  it('opens the workout that was tapped', async () => {
    home({ feed: [summary()] });

    fireEvent.press(await screen.findByTestId('feed-w1'));

    expect(actions.openSession).toHaveBeenCalledWith('w1');
  });

  it('shows weights in the unit the person chose', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    home({ feed: [summary()] });

    expect(await screen.findByText('10,626 lb')).toBeTruthy();
  });

  it('carries no standing explanation: Streak is not described on every visit', async () => {
    home({ feed: [summary()] });
    await screen.findByText('Push Day');

    expect(screen.queryByText(/Streak/)).toBeNull();
  });

  it('shows a workout as soon as it is finished, without leaving Home', async () => {
    const { repositories, queryClient } = home();
    await screen.findByText('No workouts yet');

    repositories.workouts.history.mockResolvedValue([summary()]);
    repositories.workoutDays.list.mockResolvedValue([day('2026-10-02', 3)]);
    // What finishing a workout does (useActiveWorkoutViewModel): Home's queries are refreshed in place.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: workoutKeys.history });
      await queryClient.invalidateQueries({ queryKey: workoutKeys.days });
    });

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Oct 2, today: Strong' })).toBeTruthy();
  });
});

describe('the workout in progress', () => {
  it('leads the feed, with the way back to it', async () => {
    home({ active: running() });

    expect(await screen.findByText('Leg Day')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByText('Started 19:05 · 1 set done')).toBeTruthy();

    fireEvent.press(screen.getByTestId('home-in-progress'));
    expect(actions.openActiveWorkout).toHaveBeenCalled();
  });

  it('does not light today until it is finished: the level is only ever the recorded one', async () => {
    home({ active: running() });
    await screen.findByText('Leg Day');

    expect(screen.getByRole('button', { name: 'Oct 2, today: No workout' })).toBeTruthy();
  });

  it('is not mistaken for an empty Home', async () => {
    home({ active: running() });
    await screen.findByText('Leg Day');

    expect(screen.queryByText('No workouts yet')).toBeNull();
  });
});

describe('states', () => {
  it('invites a first workout when nothing has been logged, with the wave still drawn', async () => {
    home();

    expect(await screen.findByText('No workouts yet')).toBeTruthy();
    expect(screen.getByTestId('training-wave')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start workout' }));
    expect(actions.goTab).toHaveBeenCalledWith('workout');
  });

  it('shows that workouts are loading, never an empty list in the meantime', async () => {
    const { repositories } = home({
      prepare: (fakes) => void fakes.workouts.history.mockReturnValue(new Promise(() => undefined)),
    });

    await waitFor(() => expect(repositories.workouts.history).toHaveBeenCalled());
    expect(screen.getByLabelText('Loading workouts')).toBeTruthy();
    expect(screen.queryByText('No workouts yet')).toBeNull();
  });

  it('never offers a first workout while it is still checking for one in progress', async () => {
    const { repositories } = home({
      prepare: (fakes) => void fakes.workouts.active.mockReturnValue(new Promise(() => undefined)),
    });

    await waitFor(() => expect(repositories.workouts.history).toHaveBeenCalled());
    await act(async () => undefined);
    expect(screen.queryByText('No workouts yet')).toBeNull();
    expect(screen.getByLabelText('Loading workouts')).toBeTruthy();
  });

  it('says briefly when workouts could not be read, and tries again on Retry', async () => {
    home({
      prepare: (fakes) =>
        void fakes.workouts.history.mockRejectedValueOnce(new Error('disk')).mockResolvedValue([summary()]),
    });

    expect(await screen.findByText("Couldn't load workouts")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.queryByText("Couldn't load workouts")).toBeNull();
  });
});
