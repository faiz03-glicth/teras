import { act, fireEvent, screen } from '@testing-library/react-native';

import { AppError } from '@/core/errors/AppError';
import { useAuthStore } from '@/features/auth/state/authStore';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { Workout, WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import * as toast from '@/shared/ui/toast';
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

describe("a past day's log, left before it was saved", () => {
  const PAST = '2026-09-29' as ISODate;
  const pastLog: Workout = { ...running, id: 'log', name: 'Push Day', date: PAST, pastLog: true };

  it('is not shown as in progress, but as not saved yet, a tap away', async () => {
    open(PAST, { days: [], workouts: [], active: pastLog });

    expect(await screen.findByText('Not saved yet · save or discard it')).toBeTruthy();
    expect(screen.queryByTestId('day-in-progress')).toBeNull();
    expect(screen.queryByText(/In progress/)).toBeNull();

    fireEvent.press(screen.getByTestId('day-unsaved-log'));
    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });

  it('asks for it to be saved or discarded before another day is logged', async () => {
    open(DAY, { days: [], workouts: [], active: pastLog });

    expect(await screen.findByText(/^Save or discard your log for .+ first$/)).toBeTruthy();
  });

  it('leaves today’s workout shown as in progress', async () => {
    open(TODAY, { days: [], workouts: [], active: running });

    expect(await screen.findByTestId('day-in-progress')).toBeTruthy();
    expect(screen.queryByTestId('day-unsaved-log')).toBeNull();
  });
});

describe('a day checked in on Streak but not logged here', () => {
  const STREAK_DAY = '2026-09-29' as ISODate;
  const onStreak = (repositories: Repositories) =>
    void repositories.streakDays.list.mockResolvedValue([STREAK_DAY]);

  it('reads Logged, with no details, counting toward the Streak: never a rest day', async () => {
    const { repositories } = open(STREAK_DAY, { days: [], workouts: [], prepare: onStreak });

    expect(await screen.findByText('Logged')).toBeTruthy();
    expect(screen.getByText('No details · counts toward your Streak')).toBeTruthy();
    expect(screen.queryByText('Rest day')).toBeNull();
    expect(screen.queryByText('No workout')).toBeNull();
    expect(repositories.streakDays.list).toHaveBeenCalledWith('user-1', STREAK_DAY, STREAK_DAY);
  });

  it('offers to add the workout, and says the day stays logged either way', async () => {
    open(STREAK_DAY, { days: [], workouts: [], prepare: onStreak });

    expect(await screen.findByText('ADD THE WORKOUT')).toBeTruthy();
    expect(screen.getByText('The day stays logged either way.')).toBeTruthy();
    expect(screen.queryByTestId('day-log-no-details')).toBeNull();
  });

  it('logs the workout on that day, in place of the sheet', async () => {
    const { repositories } = open(STREAK_DAY, { days: [], workouts: [], prepare: onStreak });

    fireEvent.press(await screen.findByTestId('day-log-empty'));

    await act(async () => undefined);
    expect(repositories.workouts.start).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ date: STREAK_DAY }),
    );
    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });

  it('goes to the workout in progress instead of starting a second one', async () => {
    const { repositories } = open(STREAK_DAY, { days: [], workouts: [], active: running, prepare: onStreak });

    fireEvent.press(await screen.findByTestId('day-log-blocked'));

    expect(repositories.workouts.start).not.toHaveBeenCalled();
    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });

  it('says nothing about Streak once the day is logged here', async () => {
    open(DAY, { prepare: (fakes) => void fakes.streakDays.list.mockResolvedValue([DAY]) });

    expect(await screen.findByText('Strong')).toBeTruthy();
    expect(screen.queryByText('No details · counts toward your Streak')).toBeNull();
  });
});

describe('logging a past day with no details', () => {
  const PAST = '2026-09-29' as ISODate;

  it('is offered on a past day with nothing logged', async () => {
    open(PAST, { days: [], workouts: [] });

    expect(await screen.findByTestId('day-log-no-details')).toBeTruthy();
    expect(screen.getByText('Log the day, no details')).toBeTruthy();
  });

  it('logs the day on Streak, then closes the sheet', async () => {
    const { repositories } = open(PAST, { days: [], workouts: [] });

    fireEvent.press(await screen.findByTestId('day-log-no-details'));
    await act(async () => undefined);

    expect(repositories.streakDays.logDay).toHaveBeenCalledWith('user-1', PAST);
    expect(actions.goBack).toHaveBeenCalled();
    expect(repositories.workouts.start).not.toHaveBeenCalled();
  });

  it('is offered even while a workout runs elsewhere: it starts nothing', async () => {
    open(PAST, { days: [], workouts: [], active: running });

    expect(await screen.findByTestId('day-log-blocked')).toBeTruthy();
    expect(screen.getByTestId('day-log-no-details')).toBeTruthy();
  });

  it('stays on the sheet when it could not be logged, ready to try again', async () => {
    const { repositories } = open(PAST, {
      days: [],
      workouts: [],
      prepare: (fakes) =>
        void fakes.streakDays.logDay.mockRejectedValueOnce(new AppError('Network', 'Network request failed')),
    });

    fireEvent.press(await screen.findByTestId('day-log-no-details'));
    await act(async () => undefined);

    expect(actions.goBack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('day-log-no-details'));
    await act(async () => undefined);
    expect(repositories.streakDays.logDay).toHaveBeenCalledTimes(2);
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('says why it could not be logged: a server without it is not a connection problem', async () => {
    const info = jest.spyOn(toast, 'showInfo');
    open(PAST, {
      days: [],
      workouts: [],
      prepare: (fakes) =>
        void fakes.streakDays.logDay.mockRejectedValueOnce(new AppError('Unavailable', 'not set up')),
    });

    fireEvent.press(await screen.findByTestId('day-log-no-details'));
    await act(async () => undefined);

    expect(info).toHaveBeenCalledWith({
      title: "Couldn't log the day",
      sub: "Logging a day without its workout isn't available yet.",
    });
    info.mockClear();
  });

  it('reads as busy while it is being logged', async () => {
    let finish = () => undefined as void;
    open(PAST, {
      days: [],
      workouts: [],
      prepare: (fakes) =>
        void fakes.streakDays.logDay.mockImplementationOnce(
          () => new Promise<void>((resolve) => (finish = resolve)),
        ),
    });

    fireEvent.press(await screen.findByTestId('day-log-no-details'));

    expect(screen.getByTestId('day-log-no-details').props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
    await act(async () => finish());
  });

  it('is not offered today, on a trained day, or to a guest', async () => {
    open(TODAY, { days: [], workouts: [] });
    expect(await screen.findByText('Nothing logged yet')).toBeTruthy();
    expect(screen.queryByTestId('day-log-no-details')).toBeNull();
    screen.unmount();

    open(DAY);
    expect(await screen.findByText('Strong')).toBeTruthy();
    expect(screen.queryByTestId('day-log-no-details')).toBeNull();
    screen.unmount();

    act(() => {
      useAuthStore.setState({ ...initialAuth, status: 'guest', user: null }, true);
    });
    open(PAST, { days: [], workouts: [] });
    expect(await screen.findByText('Rest day')).toBeTruthy();
    expect(screen.queryByTestId('day-log-no-details')).toBeNull();
  });
});

describe('logging a workout on the day', () => {
  const PAST = '2026-09-29' as ISODate;
  const routinesOf = (repositories: Repositories) =>
    void repositories.workouts.routines.mockResolvedValue([
      { id: 'push', name: 'Push Day', exerciseCount: 6, exercises: ['Bench Press (Barbell)'] },
      { id: 'blank', name: 'Blank', exerciseCount: 0, exercises: [] },
    ]);

  it('offers the routines with something in them, and an empty workout', async () => {
    open(PAST, { days: [], workouts: [], prepare: routinesOf });

    expect(await screen.findByText('LOG A WORKOUT')).toBeTruthy();
    expect(await screen.findByTestId('day-log-push')).toBeTruthy();
    expect(screen.getByText('6 exercises')).toBeTruthy();
    expect(screen.getByTestId('day-log-empty')).toBeTruthy();
    expect(screen.queryByTestId('day-log-blank')).toBeNull();
  });

  it('starts the routine on that day, in place of the sheet', async () => {
    const { repositories } = open(PAST, { days: [], workouts: [], prepare: routinesOf });

    fireEvent.press(await screen.findByTestId('day-log-push'));

    await act(async () => undefined);
    expect(repositories.workouts.start).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ date: PAST, routineId: 'push' }),
    );
    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });

  it('starts an empty workout on that day', async () => {
    const { repositories } = open(PAST, { days: [], workouts: [] });

    fireEvent.press(await screen.findByTestId('day-log-empty'));

    await act(async () => undefined);
    expect(repositories.workouts.start).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ date: PAST, routineId: undefined }),
    );
  });

  it('is "Start a workout" today', async () => {
    open(TODAY, { days: [], workouts: [] });

    expect(await screen.findByText('START A WORKOUT')).toBeTruthy();
  });

  it('is not offered while a workout runs on that day', async () => {
    open(TODAY, { days: [], workouts: [], active: running });

    expect(await screen.findByText('Counts when you finish')).toBeTruthy();
    expect(screen.queryByText('START A WORKOUT')).toBeNull();
    expect(screen.queryByTestId('day-log-empty')).toBeNull();
  });

  it('sends the person to a workout running on another day instead', async () => {
    const { repositories } = open(PAST, { days: [], workouts: [], active: running });

    fireEvent.press(await screen.findByTestId('day-log-blocked'));

    expect(repositories.workouts.start).not.toHaveBeenCalled();
    expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true });
  });

  it('stays on the sheet when the workout could not be started, ready to try again', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { repositories } = open(PAST, {
      days: [],
      workouts: [],
      prepare: (fakes) => void fakes.workouts.start.mockRejectedValueOnce(new Error('disk')),
    });

    fireEvent.press(await screen.findByTestId('day-log-empty'));
    await act(async () => undefined);

    expect(error).toHaveBeenCalledWith(expect.stringContaining('Could not start'));
    expect(actions.openActiveWorkout).not.toHaveBeenCalled();
    expect(screen.getByText('Add exercises as you go')).toBeTruthy();
    fireEvent.press(screen.getByTestId('day-log-empty'));
    await act(async () => undefined);
    expect(repositories.workouts.start).toHaveBeenCalledTimes(2);
    error.mockRestore();
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
