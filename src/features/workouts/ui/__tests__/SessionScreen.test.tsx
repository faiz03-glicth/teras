import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { Workout, WorkoutSet } from '@/features/workouts/data/WorkoutRepository';
import { useRoutines } from '@/features/workouts/hooks/useWorkoutQueries';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme, styleOf } from '@test/render';

import { SessionScreen } from '../SessionScreen';
import { FIRST_EXERCISES } from '../useSessionViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const set = (id: string, status: WorkoutSet['status'], weightKg: number, reps: number): WorkoutSet => ({
  id,
  position: 0,
  weightKg,
  reps,
  seconds: null,
  status,
  setType: 'normal',
  rpe: null,
  note: null,
});

const logged = (over: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  name: 'Push Day',
  routineId: 'push',
  date: '2026-09-28' as ISODate,
  startedAt: new Date(2026, 8, 28, 18, 20).toISOString(),
  endedAt: new Date(2026, 8, 28, 19, 22).toISOString(),
  bodyweightKg: 70,
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench-press-barbell',
      name: 'Bench Press (Barbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [set('s1', 'done', 60, 8), set('s2', 'pending', 60, 8), set('s3', 'done', 62.5, 6)],
    },
    {
      id: 'we2',
      exerciseId: 'bicep-curl-dumbbell',
      name: 'Bicep Curl (Dumbbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [set('s4', 'pending', 14, 10)],
    },
  ],
  ...over,
});

function session(
  id: string | null,
  { workout = logged() as Workout | null, prepare = (_repositories: Repositories) => undefined as void } = {},
) {
  const repositories = createFakeRepositories();
  repositories.workouts.logged.mockResolvedValue(workout);
  repositories.workoutDays.list.mockResolvedValue([
    { date: '2026-09-28' as ISODate, level: 3, volumeKg: 855, sets: 2, workouts: 1 },
  ]);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<SessionScreen id={id} />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('a logged workout', () => {
  it('shows its name, its day, and the level that day was recorded at', async () => {
    session('w1');

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Mon, 28 Sep · 18:20')).toBeTruthy();
    expect(screen.getByText('Strong')).toBeTruthy();
  });

  it("reads it as the signed-in person's: a link to anyone else's workout opens nothing", async () => {
    const { repositories } = session('w1');
    await screen.findByText('Push Day');

    expect(repositories.workouts.logged).toHaveBeenCalledWith('user-1', 'w1');
  });

  it('names the year of a workout from an earlier year', async () => {
    session('w1', {
      workout: logged({
        date: '2025-09-28' as ISODate,
        startedAt: new Date(2025, 8, 28, 18, 20).toISOString(),
        endedAt: new Date(2025, 8, 28, 19, 22).toISOString(),
      }),
    });

    expect(await screen.findByText('Sun, 28 Sep 2025 · 18:20')).toBeTruthy();
  });

  it('adds up its time, volume and sets from what was completed', async () => {
    session('w1');

    // 60 × 8 + 62.5 × 6: the unticked set is not part of the record.
    expect(await screen.findByLabelText('Time, 62 min. Volume, 855 kg. Sets, 2')).toBeTruthy();
  });

  it('reads its numbers on a flat panel, a surface and a 1px border with no lift', async () => {
    const { theme } = session('w1');

    const stats = await screen.findByTestId('session-stats');
    expect(styleOf(stats)).toMatchObject({
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    });
    expect(styleOf(stats).boxShadow).toBeUndefined();
    expect(within(stats).queryByTestId('cached-surface')).toBeNull();
  });

  it('keeps an exercise heading, the name in the text colour, a 48dp target', async () => {
    const { theme } = session('w1');

    const heading = await screen.findByTestId('session-exercise-open-we1');
    expect(styleOf(heading).minHeight).toBe(48);
    expect(styleOf(screen.getByText('Bench Press (Barbell)')).color).toBe(theme.colors.text);
  });

  it('lists only completed sets, numbered in order, and leaves out exercises with none', async () => {
    session('w1');

    expect(await screen.findByText('Bench Press (Barbell)')).toBeTruthy();
    expect(screen.getByText('2 sets')).toBeTruthy();
    expect(screen.getByLabelText('Set 1, 60 kg × 8, completed')).toBeTruthy();
    expect(screen.getByLabelText('Set 2, 62.5 kg × 6, completed')).toBeTruthy();
    expect(screen.queryByText('Bicep Curl (Dumbbell)')).toBeNull();
  });

  it('opens an exercise from its heading', async () => {
    session('w1');

    fireEvent.press(await screen.findByRole('button', { name: 'Bench Press (Barbell), 2 sets' }));

    expect(actions.openExercise).toHaveBeenCalledWith('bench-press-barbell');
  });

  it('shows weights in the unit the person chose', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    session('w1');

    expect(await screen.findByText('132.3 lb × 8')).toBeTruthy();
  });

  it('only reads: opening it changes nothing that was logged', async () => {
    const { repositories } = session('w1');
    await screen.findByText('Push Day');

    expect(repositories.workouts.updateSet).not.toHaveBeenCalled();
    expect(repositories.workouts.setStatus).not.toHaveBeenCalled();
    expect(repositories.workouts.finish).not.toHaveBeenCalled();
    expect(repositories.workoutDays.recordDay).not.toHaveBeenCalled();
  });

  it('goes back to where it was opened from', async () => {
    session('w1');

    fireEvent.press(await screen.findByLabelText('Back'));

    expect(actions.goBack).toHaveBeenCalled();
  });
});

describe('deleting a workout', () => {
  /** Presses the alert button labelled `label` on the last alert shown. */
  function answerAlert(label: string) {
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as AlertButton[] | undefined;
    const button = buttons?.find((one) => one.text === label);
    if (!button?.onPress) throw new Error(`No "${label}" button`);
    act(() => button.onPress?.());
  }

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('asks first, naming what would be lost, and deletes nothing until it is confirmed', async () => {
    const { repositories } = session('w1');

    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete workout?',
      "Its 2 completed sets will be deleted. This can't be undone.",
      expect.any(Array),
    );
    // Keep is the cancel button: it does nothing, so the workout is still there.
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as AlertButton[];
    expect(buttons.find((one) => one.text === 'Keep')?.style).toBe('cancel');
    expect(repositories.workouts.deleteLogged).not.toHaveBeenCalled();
    expect(actions.goBack).not.toHaveBeenCalled();
  });

  it('deletes it for the signed-in person, sends the rewritten day, and goes back', async () => {
    const { repositories } = session('w1');
    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));

    answerAlert('Delete');

    await waitFor(() => expect(repositories.workouts.deleteLogged).toHaveBeenCalledWith('user-1', 'w1'));
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    // The day reaches the server (and Streak) now, not at the next foreground.
    expect(repositories.workoutDays.pushPending).toHaveBeenCalledWith('user-1');
  });

  it('has the routine cards read their last-done line again once it is gone (S4)', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.logged.mockResolvedValue(logged());
    const { Wrapper } = createWrapper(repositories);
    // The Workout tab's routine cards, still mounted under the workout.
    function RoutineCards() {
      useRoutines(testUser().id);
      return null;
    }
    const view = renderInScheme(
      <>
        <SessionScreen id="w1" />
        <RoutineCards />
      </>,
      'light',
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(repositories.workouts.routines).toHaveBeenCalledTimes(1));
    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));

    answerAlert('Delete');
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    // The screen has closed (a refresh may wait for that); the cards stay mounted where they were, so a
    // read now can only come from the refresh, not from mounting again.
    view.rerender(
      <>
        {null}
        <RoutineCards />
      </>,
    );

    await waitFor(() => expect(repositories.workouts.routines).toHaveBeenCalledTimes(2));
  });

  it('never says the workout was not found while the screen slides away', async () => {
    const { repositories } = session('w1');
    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));
    // Whatever the screen reads from now on, the workout is gone.
    repositories.workouts.logged.mockResolvedValue(null);

    answerAlert('Delete');
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText('Workout not found')).toBeNull();
    expect(screen.getByText('Push Day')).toBeTruthy();
  });

  it('sends nothing for a guest, whose days have no server to go to', async () => {
    act(() => {
      useAuthStore.setState({ ...initialAuth, status: 'guest', user: null }, true);
    });
    const { repositories } = session('w1');
    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));

    answerAlert('Delete');

    await waitFor(() => expect(repositories.workouts.deleteLogged).toHaveBeenCalledWith(null, 'w1'));
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    expect(repositories.workoutDays.pushPending).not.toHaveBeenCalled();
  });

  it('stays on the workout and says so when it could not be deleted, so it can be tried again', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { repositories } = session('w1');
    repositories.workouts.deleteLogged.mockRejectedValueOnce(new Error('disk full'));
    fireEvent.press(await screen.findByRole('button', { name: 'Delete workout' }));

    answerAlert('Delete');

    // A native alert, since toasts stop drawing on Android after the confirm Alert.
    await waitFor(() => expect(Alert.alert).toHaveBeenLastCalledWith("Couldn't delete", 'Try again.'));
    expect(toast.info).not.toHaveBeenCalled();
    expect(actions.goBack).not.toHaveBeenCalled();
    expect(repositories.workoutDays.pushPending).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Delete workout' }));
    answerAlert('Delete');
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    expect(repositories.workouts.deleteLogged).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it('is not offered while the workout is missing', async () => {
    session('w1', { workout: null });

    expect(await screen.findByText('Workout not found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete workout' })).toBeNull();
  });
});

describe('personal records', () => {
  const benchBest = (weightKg: number) => ({
    'bench-press-barbell': { weightKg, reps: 8, seconds: null },
  });

  it('marks the set that holds the exercise record', async () => {
    const { repositories } = session('w1', {
      prepare: (fakes) => void fakes.workouts.bests.mockResolvedValue(benchBest(62.5)),
    });

    expect(await screen.findByLabelText('Set 2, 62.5 kg × 6, completed, personal record')).toBeTruthy();
    expect(screen.getByLabelText('Set 1, 60 kg × 8, completed')).toBeTruthy();
    expect(screen.getAllByText('PR')).toHaveLength(1);
    // Only what was completed is looked up, for the signed-in person.
    expect(repositories.workouts.bests).toHaveBeenCalledWith('user-1', ['bench-press-barbell']);
  });

  it('marks nothing once a later workout has beaten it', async () => {
    session('w1', { prepare: (fakes) => void fakes.workouts.bests.mockResolvedValue(benchBest(70)) });

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.queryByText('PR')).toBeNull();
  });

  it('says briefly when the records could not be read, and tries again', async () => {
    session('w1', {
      prepare: (fakes) =>
        void fakes.workouts.bests.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(benchBest(62.5)),
    });

    expect(await screen.findByText("Couldn't load this workout")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('PR')).toBeTruthy();
  });

  it('looks nothing up for a workout still running', async () => {
    const { repositories } = session('w1', { workout: logged({ endedAt: null }) });

    await waitFor(() => expect(actions.openActiveWorkout).toHaveBeenCalled());
    expect(repositories.workouts.bests).not.toHaveBeenCalled();
  });
});

describe('states', () => {
  it('says so when there is no such workout', async () => {
    session('gone', { workout: null });

    expect(await screen.findByText('Workout not found')).toBeTruthy();
  });

  it('never reads anything for a link that is not a workout', async () => {
    const { repositories } = session(null);

    expect(await screen.findByText('Workout not found')).toBeTruthy();
    expect(repositories.workouts.logged).not.toHaveBeenCalled();
  });

  it('sends a workout still running to its own screen, where sets can be ticked', async () => {
    session('w1', { workout: logged({ endedAt: null }) });

    await waitFor(() => expect(actions.openActiveWorkout).toHaveBeenCalledWith({ replace: true }));
  });

  it("shows no level until its day's level has been read, rather than a made-up one", async () => {
    const { repositories } = session('w1', {
      prepare: (fakes) => void fakes.workoutDays.list.mockReturnValue(new Promise(() => undefined)),
    });

    // The day is only asked for once the workout has been read.
    await waitFor(() => expect(repositories.workoutDays.list).toHaveBeenCalled());
    expect(screen.getByLabelText('Loading the workout')).toBeTruthy();
    expect(screen.queryByText('No workout')).toBeNull();
  });

  it("says briefly when the day's level could not be read, and tries again", async () => {
    session('w1', {
      prepare: (fakes) =>
        void fakes.workoutDays.list
          .mockRejectedValueOnce(new Error('disk'))
          .mockResolvedValue([
            { date: '2026-09-28' as ISODate, level: 3, volumeKg: 855, sets: 2, workouts: 1 },
          ]),
    });

    expect(await screen.findByText("Couldn't load this workout")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Strong')).toBeTruthy();
  });

  it('says briefly when the workout could not be read, and tries again', async () => {
    session('w1', {
      prepare: (fakes) =>
        void fakes.workouts.logged.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(logged()),
    });

    expect(await screen.findByText("Couldn't load this workout")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Push Day')).toBeTruthy();
  });
});

describe('a long workout, while the screen slides in', () => {
  afterEach(() => jest.mocked(actions.useScreenSettled).mockReturnValue(true));

  const long = logged({
    exercises: Array.from({ length: FIRST_EXERCISES + 2 }, (_, index) => ({
      id: `we${index}`,
      exerciseId: `exercise-${index}`,
      name: `Exercise ${index}`,
      type: 'weighted' as const,
      restSeconds: 90,
      sets: [set(`s${index}`, 'done', 40, 10)],
    })),
  });

  it('draws the first exercises first, and the rest once it has settled', async () => {
    jest.mocked(actions.useScreenSettled).mockReturnValue(false);
    const view = session('w1', { workout: long });

    expect(await screen.findByText('Exercise 0')).toBeTruthy();
    expect(screen.getByText(`Exercise ${FIRST_EXERCISES - 1}`)).toBeTruthy();
    expect(screen.queryByText(`Exercise ${FIRST_EXERCISES}`)).toBeNull();

    jest.mocked(actions.useScreenSettled).mockReturnValue(true);
    view.rerender(<SessionScreen id="w1" />);

    expect(screen.getByText(`Exercise ${FIRST_EXERCISES + 1}`)).toBeTruthy();
  });
});
