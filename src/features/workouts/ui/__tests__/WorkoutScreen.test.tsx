import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import * as actions from '@/shared/actions';
import { addDays } from '@/shared/lib/date/calendar';
import { toISODate } from '@/shared/lib/date/isoDate';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { WorkoutScreen } from '../WorkoutScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initialAuth = useAuthStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
  });
});

describe('the Workout tab', () => {
  it('opens the exercise library from a plain "Exercise Library" row, with no count under it', async () => {
    const repositories = createFakeRepositories();
    repositories.exercises.list.mockResolvedValue(LIBRARY);
    const { Wrapper } = createWrapper(repositories);
    renderInScheme(<WorkoutScreen />, 'light', { wrapper: Wrapper });

    expect(await screen.findByText('Exercise Library')).toBeTruthy();
    expect(screen.queryByText(/by name, muscle or equipment/)).toBeNull();
    fireEvent.press(screen.getByTestId('workout-library'));

    expect(actions.openExerciseLibrary).toHaveBeenCalled();
  });
});

describe('routines on the Workout tab', () => {
  function tab() {
    const repositories = createFakeRepositories();
    const yesterday = addDays(toISODate(new Date()), -1);
    repositories.workouts.routines.mockResolvedValue([
      {
        id: 'push',
        name: 'Push Day',
        exerciseCount: 1,
        exercises: ['Bench Press (Barbell)'],
        last: { date: yesterday, level: 4 },
      },
      { id: 'arms', name: 'Arms', exerciseCount: 0, exercises: [], last: null },
    ]);
    const { Wrapper } = createWrapper(repositories);
    renderInScheme(<WorkoutScreen />, 'light', { wrapper: Wrapper });
    return repositories;
  }

  it('makes a new routine, or opens one to edit', async () => {
    tab();

    fireEvent.press(await screen.findByRole('button', { name: 'New routine' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit Push Day' }));

    expect(actions.openNewRoutine).toHaveBeenCalled();
    expect(actions.openRoutine).toHaveBeenCalledWith('push');
  });

  it('opens a routine with nothing in it to fill, rather than previewing or starting it', async () => {
    const repositories = tab();

    expect(await screen.findByText('No exercises yet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('routine-arms'));
    fireEvent.press(screen.getByRole('button', { name: 'Start Arms' }));

    expect(actions.openRoutine).toHaveBeenNthCalledWith(1, 'arms');
    expect(actions.openRoutine).toHaveBeenNthCalledWith(2, 'arms');
    expect(actions.openRoutinePreview).not.toHaveBeenCalled();
    expect(repositories.workouts.start).not.toHaveBeenCalled();
  });

  it('previews a routine from its card, and starts it from its Start key', async () => {
    const repositories = tab();

    fireEvent.press(await screen.findByTestId('routine-push'));
    fireEvent.press(screen.getByRole('button', { name: 'Start Push Day' }));

    expect(actions.openRoutinePreview).toHaveBeenCalledWith('push');
    await waitFor(() =>
      expect(repositories.workouts.start).toHaveBeenCalledWith(
        testUser().id,
        expect.objectContaining({ routineId: 'push' }),
      ),
    );
  });

  it('says how the last time a routine was done went', async () => {
    tab();

    expect(await screen.findByText('Peak · yesterday')).toBeTruthy();
    expect(screen.getByText('Not done yet')).toBeTruthy();
  });

  it('leaves the way back to a running workout to the Resume bar: no Start empty, no second Resume', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.active.mockResolvedValue({
      id: 'w1',
      name: 'Push Day',
      routineId: 'push',
      date: toISODate(new Date()),
      startedAt: new Date().toISOString(),
      endedAt: null,
      bodyweightKg: 70,
      exercises: [],
    });
    const { Wrapper } = createWrapper(repositories);
    renderInScheme(<WorkoutScreen />, 'light', { wrapper: Wrapper });

    await waitFor(() => expect(repositories.workouts.active).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('workout-start-empty')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Resume workout' })).toBeNull();
  });
});
