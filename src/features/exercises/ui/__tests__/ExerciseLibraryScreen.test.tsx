import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import * as actions from '@/shared/actions';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { ExerciseLibraryScreen } from '../ExerciseLibraryScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initialAuth = useAuthStore.getState();

function library() {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<ExerciseLibraryScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
  });
});

describe('the exercise library', () => {
  it('opens the exercise tapped, rather than adding it anywhere', async () => {
    const { repositories } = library();

    expect(await screen.findByRole('header', { name: 'Exercises' })).toBeTruthy();
    fireEvent.press(await screen.findByTestId('all-squat-barbell'));

    expect(actions.openExercise).toHaveBeenCalledWith('squat-barbell');
    expect(repositories.workouts.addExercise).not.toHaveBeenCalled();
  });

  it('goes back where it was opened from', async () => {
    library();

    fireEvent.press(await screen.findByLabelText('Back'));

    expect(actions.goBack).toHaveBeenCalled();
  });
});
