import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import * as actions from '@/shared/actions';
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
  it('opens the exercise library, saying how big it is', async () => {
    const repositories = createFakeRepositories();
    repositories.exercises.list.mockResolvedValue(LIBRARY);
    const { Wrapper } = createWrapper(repositories);
    renderInScheme(<WorkoutScreen />, 'light', { wrapper: Wrapper });

    expect(await screen.findByText('5 exercises · by name, muscle or equipment')).toBeTruthy();
    fireEvent.press(screen.getByTestId('workout-library'));

    expect(actions.openExerciseLibrary).toHaveBeenCalled();
  });
});

describe('routines on the Workout tab', () => {
  function tab() {
    const repositories = createFakeRepositories();
    repositories.workouts.routines.mockResolvedValue([
      { id: 'push', name: 'Push Day', exerciseCount: 1, exercises: ['Bench Press (Barbell)'] },
      { id: 'arms', name: 'Arms', exerciseCount: 0, exercises: [] },
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

  it('opens a routine with nothing in it to fill, rather than starting it', async () => {
    const repositories = tab();

    expect(await screen.findByText('No exercises yet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('routine-arms'));

    expect(actions.openRoutine).toHaveBeenCalledWith('arms');
    expect(repositories.workouts.start).not.toHaveBeenCalled();
  });
});
