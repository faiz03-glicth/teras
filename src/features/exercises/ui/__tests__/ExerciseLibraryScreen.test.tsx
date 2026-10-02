import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useExerciseBrowserStore } from '@/features/exercises/state/exerciseBrowserStore';
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

  it('creates an exercise from its header', async () => {
    library();

    fireEvent.press(await screen.findByRole('button', { name: 'Create' }));

    expect(actions.openCreateExercise).toHaveBeenCalled();
  });
});

describe('filtering the library', () => {
  const browser = () => useExerciseBrowserStore.getState();

  it('opens the equipment and muscle filters', async () => {
    library();

    fireEvent.press(await screen.findByRole('button', { name: 'Equipment, All equipment' }));
    fireEvent.press(screen.getByRole('button', { name: 'Muscle, All muscles' }));

    expect(actions.openEquipmentFilter).toHaveBeenCalled();
    expect(actions.openMuscleFilter).toHaveBeenCalled();
  });

  it('lists only what the filters allow, and says which are on', async () => {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();

    act(() => {
      browser().setMuscle('chest');
      browser().setEquipment('dumbbell');
    });

    expect(await screen.findByText('1 EXERCISE')).toBeTruthy();
    expect(screen.getByTestId('all-incline-bench-press-dumbbell')).toBeTruthy();
    expect(screen.queryByTestId('all-bench-press-barbell')).toBeNull();
    expect(screen.getByRole('button', { name: 'Muscle, Chest' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Equipment, Dumbbell' })).toBeTruthy();
  });

  it('offers to clear the filters, or create the exercise, when nothing matches', async () => {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
    act(() => browser().setMuscle('calves'));

    expect(await screen.findByText('No exercise matches')).toBeTruthy();
    expect(screen.getByText('Check the spelling, clear a filter, or create it yourself.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Create exercise' }));
    expect(actions.openCreateExercise).toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Muscle, All muscles' })).toBeTruthy();
  });

  it('starts afresh each time it opens', async () => {
    act(() => {
      browser().setQuery('plank');
      browser().setMuscle('calves');
    });
    library();

    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
    expect(screen.getByTestId('exercise-search').props.value).toBe('');
  });
});
