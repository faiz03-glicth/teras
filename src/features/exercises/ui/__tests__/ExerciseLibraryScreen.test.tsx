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

  it('opens the equipment filter', async () => {
    library();

    fireEvent.press(await screen.findByRole('button', { name: 'Equipment, All equipment' }));

    expect(actions.openEquipmentFilter).toHaveBeenCalled();
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
    expect(screen.queryByTestId('muscle-panel')).toBeNull();
  });
});

describe('the muscle filter', () => {
  const browser = () => useExerciseBrowserStore.getState();
  // The drawing is hidden from screen readers, which pick from the list of muscles instead.
  const hidden = { includeHiddenElements: true };
  const lit = (region: string) => screen.queryByTestId(`highlight-${region}`, hidden);

  async function openMuscles() {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Muscle, All muscles' }));
  }

  it('opens in place: the body above, the whole list still below', async () => {
    await openMuscles();

    expect(screen.getByTestId('muscle-panel')).toBeTruthy();
    expect(screen.getByTestId('body-map', hidden)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Muscle, All muscles' })).toBeExpanded();
    expect(screen.getByRole('radio', { name: 'All muscles' })).toBeChecked();
    expect(screen.getByText('ALL EXERCISES')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('lights the muscle picked and narrows the list, keeping the body in view', async () => {
    await openMuscles();

    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));

    expect(await screen.findByText('2 EXERCISES')).toBeTruthy();
    expect(lit('pectorals')).toBeTruthy();
    expect(screen.getByTestId('muscle-panel')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Chest' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Muscle, Chest' })).toBeTruthy();
    expect(screen.getByTestId('all-bench-press-barbell')).toBeTruthy();
    expect(screen.queryByTestId('all-squat-barbell')).toBeNull();
    expect(actions.goBack).not.toHaveBeenCalled();
  });

  it('picks a muscle tapped on the body', async () => {
    await openMuscles();

    fireEvent.press(screen.getByTestId('region-reardelts', hidden));

    expect(await screen.findByText('1 EXERCISE')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Shoulders' })).toBeChecked();
    expect(lit('deltoids')).toBeTruthy();
    expect(lit('reardelts')).toBeTruthy();
  });

  it('moves the light to the next muscle picked', async () => {
    await openMuscles();
    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));

    fireEvent.press(screen.getByRole('radio', { name: 'Shoulders' }));

    expect(await screen.findByText('1 EXERCISE')).toBeTruthy();
    expect(lit('deltoids')).toBeTruthy();
    expect(lit('pectorals')).toBeNull();
  });

  it('clears every filter at once, leaving the body plain and open', async () => {
    await openMuscles();
    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));
    act(() => browser().setEquipment('dumbbell'));
    expect(await screen.findByText('1 EXERCISE')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();
    expect(lit('pectorals')).toBeNull();
    expect(screen.getByRole('radio', { name: 'All muscles' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Equipment, All equipment' })).toBeTruthy();
    expect(screen.getByTestId('muscle-panel')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('closes from its button, keeping the muscle chosen', async () => {
    await openMuscles();
    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));
    expect(await screen.findByText('2 EXERCISES')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Muscle, Chest' }));

    expect(screen.queryByTestId('muscle-panel')).toBeNull();
    expect(screen.getByRole('button', { name: 'Muscle, Chest' })).not.toBeExpanded();
    expect(screen.getByText('2 EXERCISES')).toBeTruthy();
  });
});

describe('the list, grouped by muscle', () => {
  const browser = () => useExerciseBrowserStore.getState();
  const headings = () => screen.getAllByRole('header').map((node) => node.props.children);

  it('heads each primary muscle once, in the library order', async () => {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();

    expect(headings()).toEqual(expect.arrayContaining(['Chest', 'Biceps', 'Abs', 'Quads']));
    expect(screen.getAllByRole('header', { name: 'Chest' })).toHaveLength(1);
  });

  it('files an exercise under its primary muscle, even when filtered by a secondary one', async () => {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();

    act(() => browser().setMuscle('shoulders'));

    expect(await screen.findByText('1 EXERCISE')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Chest' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Shoulders' })).toBeNull();
  });

  it('keeps the grouping while searching', async () => {
    library();
    expect(await screen.findByText('ALL EXERCISES')).toBeTruthy();

    act(() => browser().setQuery('bench'));

    expect(await screen.findByText('2 EXERCISES')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Chest' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Quads' })).toBeNull();
  });
});
