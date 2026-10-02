import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { Workout } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { exerciseRow, LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { AddExerciseScreen } from '../AddExerciseScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const running: Workout = {
  id: 'w1',
  name: 'Workout',
  routineId: null,
  date: '2026-10-02' as ISODate,
  startedAt: '2026-10-02T17:00:00.000Z',
  endedAt: null,
  bodyweightKg: 70,
  exercises: [],
};

function open(prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  repositories.workouts.active.mockResolvedValue(running);
  repositories.workouts.addExercise.mockResolvedValue(running);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<AddExerciseScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg', restSeconds: 90 });
  });
});

describe('the exercise browser', () => {
  it('leads with favourites and recent exercises, then lists them all', async () => {
    open((fakes) => {
      fakes.exercises.favourites.mockResolvedValue(['squat-barbell']);
      fakes.exercises.recent.mockResolvedValue(['plank']);
    });

    expect(await screen.findByTestId('favourites-squat-barbell')).toBeTruthy();
    expect(screen.getByText('FAVOURITES')).toBeTruthy();
    expect(screen.getByText('RECENT')).toBeTruthy();
    expect(screen.getByTestId('recent-plank')).toBeTruthy();
    expect(screen.getByText('ALL EXERCISES')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search 5 exercises')).toBeTruthy();
  });

  it('marks a favourite wherever it is listed', async () => {
    open((fakes) => fakes.exercises.favourites.mockResolvedValue(['squat-barbell']));

    expect(await screen.findAllByLabelText('Squat (Barbell), Quads · Glutes, favourite')).toHaveLength(2);
  });

  it('searches by name, muscle, equipment or shorthand, and counts the matches', async () => {
    open((fakes) => fakes.exercises.favourites.mockResolvedValue(['squat-barbell']));

    fireEvent.changeText(await screen.findByTestId('exercise-search'), 'db');

    expect(await screen.findByText('2 EXERCISES')).toBeTruthy();
    expect(screen.queryByText('FAVOURITES')).toBeNull();
    expect(screen.getByTestId('all-bicep-curl-dumbbell')).toBeTruthy();
    expect(screen.queryByTestId('all-squat-barbell')).toBeNull();
  });

  it('lists forty at a time, and says how many more there are', async () => {
    const many = Array.from({ length: 45 }, (_, index) =>
      exerciseRow(`ex-${index}`, `Exercise ${String(index).padStart(2, '0')}`),
    );
    open((fakes) => fakes.exercises.list.mockResolvedValue(many));

    expect(await screen.findByTestId('all-ex-39')).toBeTruthy();
    expect(screen.queryByTestId('all-ex-40')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Show more (5 left)' }));

    expect(screen.getByTestId('all-ex-44')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Show more/ })).toBeNull();
  });

  it('says when nothing matches, and clears the search', async () => {
    open();
    fireEvent.changeText(await screen.findByTestId('exercise-search'), 'zzz');

    expect(await screen.findByText('No exercise matches')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Clear' }));

    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
  });

  it('says briefly when the library could not be read, and tries again', async () => {
    open((fakes) => fakes.exercises.list.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(LIBRARY));

    expect(await screen.findByText("Couldn't load exercises")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
  });
});

describe('adding one to the workout', () => {
  it('adds the exercise tapped, then goes back to the workout', async () => {
    const { repositories } = open();

    fireEvent.press(await screen.findByTestId('all-squat-barbell'));

    await waitFor(() =>
      expect(repositories.workouts.addExercise).toHaveBeenCalledWith('w1', 'squat-barbell', 90),
    );
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
  });

  it("opens an exercise's details from its info button, without adding it", async () => {
    const { repositories } = open();

    fireEvent.press(await screen.findByRole('button', { name: 'About Squat (Barbell)' }));

    expect(actions.openExercise).toHaveBeenCalledWith('squat-barbell');
    expect(repositories.workouts.addExercise).not.toHaveBeenCalled();
  });
});
