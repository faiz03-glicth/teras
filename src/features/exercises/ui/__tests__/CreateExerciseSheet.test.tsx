import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useExerciseBrowserStore } from '@/features/exercises/state/exerciseBrowserStore';
import * as actions from '@/shared/actions';
import { exerciseRow, LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { CreateExerciseSheet } from '../CreateExerciseSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();
const browser = () => useExerciseBrowserStore.getState();

function open(prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<CreateExerciseSheet />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    browser().clear();
  });
});

describe('creating an exercise', () => {
  it('creates it from the name and choices given, then finds it in the list', async () => {
    const { repositories } = open((fakes) =>
      fakes.exercises.create.mockResolvedValue({
        ok: true,
        exercise: exerciseRow('new-1', 'Landmine Press', { primaryMuscle: 'shoulders', isCustom: true }),
      }),
    );
    act(() => browser().setMuscle('chest'));

    expect(screen.getByRole('header', { name: 'Create exercise' })).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Name'), 'Landmine Press');
    fireEvent.press(screen.getByRole('radio', { name: 'Shoulders' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create exercise' }));

    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    expect(repositories.exercises.create).toHaveBeenCalledWith('user-1', {
      name: 'Landmine Press',
      equipment: 'barbell',
      primaryMuscle: 'shoulders',
    });
    // The list behind shows the new exercise: searched for, with no filter hiding it.
    expect(browser()).toMatchObject({ query: 'Landmine Press', muscle: null, equipment: null });
  });

  it('starts from what was being searched for', () => {
    act(() => browser().setQuery('  landmine press '));
    open();

    expect(screen.getByLabelText('Name').props.value).toBe('landmine press');
  });

  it('measures the exercise by the equipment chosen', async () => {
    const { repositories } = open((fakes) =>
      fakes.exercises.create.mockResolvedValue({
        ok: true,
        exercise: exerciseRow('new-1', 'Deficit Push Up'),
      }),
    );

    fireEvent.changeText(screen.getByLabelText('Name'), 'Deficit Push Up');
    fireEvent.press(screen.getByRole('radio', { name: 'Bodyweight' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create exercise' }));

    await waitFor(() =>
      expect(repositories.exercises.create).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ equipment: 'bodyweight', primaryMuscle: 'chest' }),
      ),
    );
  });

  it('says why a name cannot be used, and stays open until it is changed', async () => {
    open((fakes) =>
      fakes.exercises.create.mockResolvedValue({ ok: false, reason: 'Plank is already in your exercises' }),
    );

    fireEvent.changeText(screen.getByLabelText('Name'), 'plank');
    fireEvent.press(screen.getByRole('button', { name: 'Create exercise' }));

    expect(await screen.findByText('Plank is already in your exercises')).toBeTruthy();
    expect(actions.goBack).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Name'), 'Plank Reach');
    expect(screen.queryByText('Plank is already in your exercises')).toBeNull();
  });

  it('says briefly when it could not be saved, and keeps what was typed', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    open((fakes) => fakes.exercises.create.mockRejectedValue(new Error('disk')));

    fireEvent.changeText(screen.getByLabelText('Name'), 'Landmine Press');
    fireEvent.press(screen.getByRole('button', { name: 'Create exercise' }));

    await waitFor(() => expect(logged).toHaveBeenCalledWith(expect.stringContaining('Could not create')));
    expect(screen.getByRole('button', { name: 'Create exercise' })).toBeEnabled();
    expect(actions.goBack).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name').props.value).toBe('Landmine Press');
    logged.mockRestore();
  });
});
