import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { processColor } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { ExerciseSession, Workout } from '@/features/workouts/data/WorkoutRepository';
import type { RecordSet } from '@/features/workouts/domain/records';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { ExerciseDetailScreen } from '../ExerciseDetailScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Friday 2 October 2026.
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const done = (weightKg: number, reps: number): RecordSet => ({
  status: 'done',
  setType: 'normal',
  weightKg,
  reps,
  seconds: null,
});

const session = (workoutId: string, date: string, sets: RecordSet[]): ExerciseSession => ({
  workoutId,
  name: 'Push Day',
  date: date as ISODate,
  startedAt: `${date}T17:00:00.000Z`,
  sets,
});

/** Two sessions, the latest first: the record (62.5 kg) was set in the latest. */
const HISTORY = [
  session('w2', '2026-09-29', [done(62.5, 5), done(60, 8)]),
  session('w1', '2026-09-22', [done(60, 6)]),
];

const running: Workout = {
  id: 'run',
  name: 'Workout',
  routineId: null,
  date: '2026-10-02' as ISODate,
  startedAt: '2026-10-02T17:00:00.000Z',
  endedAt: null,
  bodyweightKg: 70,
  exercises: [],
};

function detail(id: string | null, prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.exercises.get.mockImplementation(
    async (one: string) => LIBRARY.find((row) => row.id === one) ?? null,
  );
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  repositories.workouts.exerciseHistory.mockResolvedValue(HISTORY);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<ExerciseDetailScreen id={id} />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg', restSeconds: 90 });
  });
});

describe('what the exercise is', () => {
  it('names it, and says how it is done', async () => {
    detail('bench-press-barbell');

    expect(await screen.findByRole('header', { name: 'Bench Press (Barbell)' })).toBeTruthy();
    expect(screen.getByText('Barbell')).toBeTruthy();
    expect(screen.getByText('Compound')).toBeTruthy();
    expect(screen.getByText('Weighted')).toBeTruthy();
  });

  it('names the muscles it works', async () => {
    detail('bench-press-barbell');

    expect(await screen.findByLabelText('Primary, Chest')).toBeTruthy();
    expect(screen.getByLabelText('Secondary, Triceps, Shoulders')).toBeTruthy();
  });

  it('shows them on the body, the main one strongest', async () => {
    const { theme } = detail('bench-press-barbell');
    // The drawing is hidden from screen readers: the rows beside it name the muscles.
    const fillOf = (name: string) =>
      screen.getByTestId(`region-${name}`, { includeHiddenElements: true }).props.fill;
    // How react-native-svg hands a plain colour to the native view.
    const svgColor = (color: string) => ({ type: 0, payload: processColor(color) });

    expect(await screen.findByLabelText('Primary, Chest')).toBeTruthy();
    expect(fillOf('pectorals')).toEqual(svgColor(theme.heat[4]));
    expect(fillOf('triceps')).toEqual(svgColor(theme.heat[2]));
    expect(fillOf('quadriceps')).toEqual(svgColor(theme.colors.border));
  });

  it('suggests more for the same muscle, and opens one', async () => {
    detail('bench-press-barbell');

    expect(await screen.findByText('More for chest')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Incline Bench Press (Dumbbell)' }));

    expect(actions.openExercise).toHaveBeenCalledWith('incline-bench-press-dumbbell');
  });
});

describe('its records and history', () => {
  it('shows the record and the best estimated one-rep max', async () => {
    detail('bench-press-barbell');

    expect(await screen.findByLabelText('Heaviest weight, 62.5 kg, personal record')).toBeTruthy();
    // 60 kg × 8 = 76 kg by Epley, more than 62.5 × 5.
    expect(screen.getByLabelText('Estimated 1RM, 76 kg')).toBeTruthy();
  });

  it('charts the best set of each week', async () => {
    detail('bench-press-barbell');

    expect(await screen.findByLabelText('Best set each week, 2 weeks, latest 62.5 kg')).toBeTruthy();
  });

  it('lists each session, latest first, marking the one that holds the record', async () => {
    detail('bench-press-barbell');

    const latest = await screen.findByRole('button', { name: /^Tue, 29 Sep · Push Day/ });
    expect(latest.props.accessibilityLabel).toBe(
      'Tue, 29 Sep · Push Day, 62.5 kg × 5 · 60 kg × 8, personal record',
    );
    expect(screen.getByText('2 sessions')).toBeTruthy();

    fireEvent.press(latest);
    expect(actions.openSession).toHaveBeenCalledWith('w2');
  });

  it('says what will appear once it has been logged', async () => {
    detail('bench-press-barbell', (fakes) => fakes.workouts.exerciseHistory.mockResolvedValue([]));

    expect(await screen.findByText(/No history yet/)).toBeTruthy();
    expect(screen.queryByText('Heaviest weight')).toBeNull();
  });
});

describe('acting on it', () => {
  it('favourites it, and can take it back', async () => {
    const { repositories } = detail('bench-press-barbell', (fakes) => {
      // Kept like the real thing: what was saved is what is read back.
      let saved: string[] = [];
      fakes.exercises.favourites.mockImplementation(async () => saved);
      fakes.exercises.setFavourite.mockImplementation(
        async (_owner: unknown, exerciseId: string, on: boolean) => {
          saved = on ? [exerciseId] : [];
        },
      );
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Add to favourites' }));

    await waitFor(() =>
      expect(repositories.exercises.setFavourite).toHaveBeenCalledWith('user-1', 'bench-press-barbell', true),
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Remove from favourites' }));

    await waitFor(() =>
      expect(repositories.exercises.setFavourite).toHaveBeenLastCalledWith(
        'user-1',
        'bench-press-barbell',
        false,
      ),
    );
    expect(await screen.findByRole('button', { name: 'Add to favourites' })).toBeTruthy();
  });

  it('adds it to the workout in progress, then returns to the workout', async () => {
    const { repositories } = detail('bench-press-barbell', (fakes) => {
      fakes.workouts.active.mockResolvedValue(running);
      fakes.workouts.addExercise.mockResolvedValue(running);
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Add to workout' }));

    await waitFor(() =>
      expect(repositories.workouts.addExercise).toHaveBeenCalledWith('run', 'bench-press-barbell', 90),
    );
    await waitFor(() => expect(actions.returnToWorkout).toHaveBeenCalled());
  });

  it('offers nothing to add to when no workout is running', async () => {
    detail('bench-press-barbell');

    await screen.findByText('More for chest');
    expect(screen.queryByRole('button', { name: 'Add to workout' })).toBeNull();
  });
});

describe('states', () => {
  it('says so for an exercise that is not there', async () => {
    detail('gone');

    expect(await screen.findByText('Exercise not found')).toBeTruthy();
  });

  it('says briefly when it could not be read, and tries again', async () => {
    detail('bench-press-barbell', (fakes) =>
      fakes.workouts.exerciseHistory.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(HISTORY),
    );

    expect(await screen.findByText("Couldn't load this exercise")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('More for chest')).toBeTruthy();
  });
});
