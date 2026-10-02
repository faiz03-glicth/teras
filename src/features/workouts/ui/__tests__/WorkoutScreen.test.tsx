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
