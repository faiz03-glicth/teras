import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/features/workouts/data/WorkoutRepository';
import { useRestTimerStore } from '@/features/workouts/state/restTimerStore';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { ActiveWorkoutScreen } from '../ActiveWorkoutScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

type Repositories = ReturnType<typeof createFakeRepositories>;

const NOW = new Date(2026, 9, 2, 18, 0, 0).getTime();
const initialAuth = useAuthStore.getState();

const set = (id: string, status: WorkoutSet['status'], over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id,
  position: 0,
  weightKg: 60,
  reps: 8,
  seconds: null,
  status,
  setType: 'normal',
  rpe: null,
  note: null,
  ...over,
});

const bench = (sets: WorkoutSet[], over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({
  id: 'we1',
  exerciseId: 'bench-press-barbell',
  name: 'Bench Press (Barbell)',
  type: 'weighted',
  restSeconds: 90,
  sets,
  ...over,
});

const running = (exercises: WorkoutExercise[]): Workout => ({
  id: 'w1',
  name: 'Push Day',
  routineId: 'push',
  date: '2026-10-02' as ISODate,
  startedAt: new Date(NOW - 12 * 60 * 1000).toISOString(),
  endedAt: null,
  bodyweightKg: 70,
  exercises,
});

/** The workout with one set's status changed, as the repository hands it back. */
const withStatus = (workout: Workout, setId: string, status: WorkoutSet['status']): Workout => ({
  ...workout,
  exercises: workout.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((one) => (one.id === setId ? { ...one, status } : one)),
  })),
});

function log(workout: Workout, prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.workouts.active.mockResolvedValue(workout);
  repositories.workouts.setStatus.mockImplementation(async (setId, status) =>
    withStatus(workout, setId, status),
  );
  repositories.workouts.updateSet.mockResolvedValue(workout);
  repositories.workouts.finish.mockResolvedValue({
    date: workout.date,
    volumeKg: 480,
    sets: 1,
    workouts: 1,
    level: 2,
  });
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<ActiveWorkoutScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories, Wrapper };
}

/** Presses the alert button labelled `label` on the last alert shown. */
function answerAlert(label: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as AlertButton[] | undefined;
  const button = buttons?.find((one) => one.text === label);
  if (!button?.onPress) throw new Error(`No "${label}" button`);
  act(() => button.onPress?.());
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
    useRestTimerStore.setState({ workoutId: null, endsAt: null });
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the rest timer', () => {
  it("starts when a set is ticked, at that exercise's rest", async () => {
    log(running([bench([set('s1', 'pending')])]));

    fireEvent.press(await screen.findByTestId('set-s1-tick'));

    expect(await screen.findByTestId('rest-bar')).toBeTruthy();
    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('moves by 15 seconds either way, and Skip ends it', async () => {
    log(running([bench([set('s1', 'pending')])]));
    fireEvent.press(await screen.findByTestId('set-s1-tick'));
    await screen.findByTestId('rest-bar');

    fireEvent.press(screen.getByRole('button', { name: 'Add 15 seconds' }));
    expect(screen.getByText('1:45')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Take off 15 seconds' }));
    fireEvent.press(screen.getByRole('button', { name: 'Take off 15 seconds' }));
    expect(screen.getByText('1:15')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Skip rest' }));
    expect(screen.queryByTestId('rest-bar')).toBeNull();
  });

  it('counts down, and says when it is over', async () => {
    log(running([bench([set('s1', 'pending')])]));
    fireEvent.press(await screen.findByTestId('set-s1-tick'));
    await screen.findByTestId('rest-bar');

    act(() => jest.advanceTimersByTime(30_000));
    // The clock redraws a few times a second, so half a minute in it reads 1:00, or 1:01 for an instant.
    expect(screen.getByText(/^1:0[01]$/)).toBeTruthy();

    act(() => jest.advanceTimersByTime(61_000));
    expect(screen.queryByTestId('rest-bar')).toBeNull();
    expect(toast.info).toHaveBeenCalledWith(
      'Rest over',
      expect.objectContaining({ description: 'Next set' }),
    );
  });

  it('keeps running when the workout is left and opened again', async () => {
    const { unmount } = log(running([bench([set('s1', 'pending')])]));
    fireEvent.press(await screen.findByTestId('set-s1-tick'));
    await screen.findByTestId('rest-bar');
    unmount();

    act(() => jest.advanceTimersByTime(10_000));
    log(running([bench([set('s1', 'done')])]));

    expect(await screen.findByText('1:20')).toBeTruthy();
  });

  it('ends when the set is unticked', async () => {
    log(running([bench([set('s1', 'pending')])]));
    fireEvent.press(await screen.findByTestId('set-s1-tick'));
    await screen.findByTestId('rest-bar');

    fireEvent.press(screen.getByTestId('set-s1-tick'));

    await waitFor(() => expect(screen.queryByTestId('rest-bar')).toBeNull());
  });
});

describe('the set table', () => {
  it('names the weight column in the unit chosen, and shows weights in it', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    log(running([bench([set('s1', 'pending', { weightKg: 61.23497 })])]));

    // The column names are for the eye; each field says what it holds to a screen reader.
    expect(await screen.findByText('LB', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('set-s1-weight').props.value).toBe('135');
  });

  it('stores a weight typed in pounds as kilograms, so volume and levels stay true', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    const { repositories } = log(running([bench([set('s1', 'pending', { weightKg: null })])]));

    fireEvent.changeText(await screen.findByTestId('set-s1-weight'), '225');

    await waitFor(() => expect(repositories.workouts.updateSet).toHaveBeenCalled());
    const [setId, patch] = jest.mocked(repositories.workouts.updateSet).mock.calls.at(-1) ?? [];
    expect(setId).toBe('s1');
    expect(patch?.weightKg).toBeCloseTo(102.058, 2);
  });

  it('calls the weight of a bodyweight exercise what it is: weight added', async () => {
    log(running([bench([set('s1', 'pending')], { type: 'bodyweight', name: 'Pull Up' })]));

    expect(await screen.findByText('+KG', { includeHiddenElements: true })).toBeTruthy();
  });

  it('locks a completed set: untick it to change it', async () => {
    log(running([bench([set('s1', 'done'), set('s2', 'pending')])]));

    expect((await screen.findByTestId('set-s1-weight')).props.editable).toBe(false);
    expect(screen.getByTestId('set-s2-weight').props.editable).toBe(true);
  });

  it('saves edits in the order they were typed', async () => {
    const { repositories } = log(running([bench([set('s1', 'pending', { reps: null })])]));
    let finishFirst: (() => void) | undefined;
    const first = new Promise<void>((resolve) => (finishFirst = resolve));
    const order: string[] = [];
    repositories.workouts.updateSet.mockImplementation(async (_id, patch) => {
      if (patch.reps === 1) await first;
      order.push(String(patch.reps));
      return running([bench([set('s1', 'pending', { reps: patch.reps ?? null })])]);
    });

    const reps = await screen.findByTestId('set-s1-reps');
    fireEvent.changeText(reps, '1');
    fireEvent.changeText(reps, '12');
    await act(async () => finishFirst?.());

    await waitFor(() => expect(order).toEqual(['1', '12']));
  });
});

describe('the Previous column', () => {
  it("shows last time's set beside each set, and says where there was none", async () => {
    const { repositories } = log(running([bench([set('s1', 'pending'), set('s2', 'pending')])]), (fakes) => {
      fakes.workouts.previousSets.mockResolvedValue({
        'bench-press-barbell': [{ weightKg: 60, reps: 8, seconds: null }],
      });
    });

    expect(await screen.findByLabelText('Previous, 60kg × 8')).toBeTruthy();
    expect(screen.getAllByLabelText('No previous set')).toHaveLength(1);
    expect(repositories.workouts.previousSets).toHaveBeenCalledWith('user-1', ['bench-press-barbell']);
  });

  it('reads last time in the unit chosen', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    log(running([bench([set('s1', 'pending')])]), (fakes) => {
      fakes.workouts.previousSets.mockResolvedValue({
        'bench-press-barbell': [{ weightKg: 61.23497, reps: 8, seconds: null }],
      });
    });

    expect(await screen.findByLabelText('Previous, 135lb × 8')).toBeTruthy();
  });
});

describe('an empty workout', () => {
  it('is one clear action: add an exercise', async () => {
    log(running([]));

    expect(await screen.findByText('Get started')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add exercise' }));
    expect(actions.openAddExercise).toHaveBeenCalled();
  });
});

describe('leaving', () => {
  it('minimises with the back chevron: the workout keeps running', async () => {
    const { repositories } = log(running([bench([set('s1', 'done')])]));

    fireEvent.press(await screen.findByLabelText('Minimize'));

    expect(actions.goBack).toHaveBeenCalled();
    expect(repositories.workouts.discard).not.toHaveBeenCalled();
  });

  it('asks before discarding, naming what would be lost', async () => {
    const { repositories } = log(running([bench([set('s1', 'done')])]));

    fireEvent.press(await screen.findByRole('button', { name: 'Discard workout' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard workout?',
      'Your 1 completed set will be deleted.',
      expect.any(Array),
    );
    answerAlert('Discard');
    await waitFor(() => expect(repositories.workouts.discard).toHaveBeenCalledWith('w1'));
  });
});

describe('finishing', () => {
  it('saves straight away when every set is ticked, then shows what was saved', async () => {
    const { repositories } = log(running([bench([set('s1', 'done')])]));

    fireEvent.press(await screen.findByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(repositories.workouts.finish).toHaveBeenCalledWith('w1'));
    expect(Alert.alert).not.toHaveBeenCalled();
    await waitFor(() => expect(actions.openWorkoutSaved).toHaveBeenCalledWith('w1'));
  });

  it("finishes early only after saying which sets won't be saved", async () => {
    const { repositories } = log(running([bench([set('s1', 'done'), set('s2', 'pending')])]));

    fireEvent.press(await screen.findByRole('button', { name: 'Finish' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Finish workout?',
      "1 unticked set won't be saved. The 1 you completed already is.",
      expect.any(Array),
    );
    expect(repositories.workouts.finish).not.toHaveBeenCalled();
    answerAlert('Finish');
    await waitFor(() => expect(repositories.workouts.finish).toHaveBeenCalledWith('w1'));
  });

  it('stops the rest timer with the workout', async () => {
    log(running([bench([set('s1', 'pending'), set('s2', 'pending')])]));
    fireEvent.press(await screen.findByTestId('set-s1-tick'));
    await screen.findByTestId('rest-bar');

    fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    answerAlert('Finish');

    await waitFor(() => expect(actions.openWorkoutSaved).toHaveBeenCalled());
    expect(useRestTimerStore.getState().endsAt).toBeNull();
  });
});
