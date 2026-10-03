import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Activity } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import type { RoutineDraftItem } from '@/features/routines/domain/draft';
import { useRoutineDraftStore } from '@/features/routines/state/routineDraftStore';
import * as actions from '@/shared/actions';
import { NEW_ROUTINE } from '@/shared/actions/params';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { EditRoutineScreen } from '../EditRoutineScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const item = (key: string, exerciseId: string, over: Partial<RoutineDraftItem> = {}): RoutineDraftItem => ({
  key,
  exerciseId,
  targetSets: 3,
  targetReps: 10,
  targetSeconds: null,
  startWeightKg: null,
  ...over,
});

const PUSH = {
  routineId: 'push',
  name: 'Push Day',
  items: [
    item('i1', 'bench-press-barbell', { targetSets: 4, targetReps: 8 }),
    item('i2', 'incline-bench-press-dumbbell'),
  ],
};

/** The editor, shown or (another screen over it) hidden, as a navigator may do. */
const editor = (routineId: string | null, mode: 'visible' | 'hidden' = 'visible', key = 'editor') => (
  <Activity mode={mode}>
    <EditRoutineScreen key={key} routineId={routineId} />
  </Activity>
);

function edit(routineId: string | null, prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  repositories.routines.get.mockImplementation(async (_owner: string | null, id: string) =>
    id === 'push' ? PUSH : null,
  );
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(editor(routineId), 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

/** The exercise names as listed, top to bottom. */
const names = () =>
  screen.getAllByTestId(/^routine-item-name-/).map((node) => (node.props as { children: string }).children);

/** Presses the alert button labelled `label` on the last alert shown. */
function answerAlert(label: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as AlertButton[] | undefined;
  const button = buttons?.find((one) => one.text === label);
  if (!button?.onPress) throw new Error(`No "${label}" button`);
  act(() => button.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a new routine', () => {
  it('starts named "New routine", with nothing in it yet', async () => {
    edit(NEW_ROUTINE);

    expect(await screen.findByRole('header', { name: 'New routine' })).toBeTruthy();
    expect(screen.getByLabelText('Routine name').props.value).toBe('New routine');
    expect(screen.getByText('No exercises yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete routine' })).toBeNull();
  });

  it('adds exercises from the library, at three sets of ten', async () => {
    edit(NEW_ROUTINE);
    fireEvent.press(await screen.findByRole('button', { name: 'Add exercise' }));
    expect(actions.openAddExercise).toHaveBeenCalledWith('routine');

    // What the library hands back when an exercise is picked.
    act(() => useRoutineDraftStore.getState().add('squat-barbell', 'weighted'));

    expect(await screen.findByText('Squat (Barbell)')).toBeTruthy();
    expect(screen.getByText('3 sets × 10 reps · Quads')).toBeTruthy();
  });

  it('saves it, says so, then goes back', async () => {
    const { repositories } = edit(NEW_ROUTINE);
    await screen.findByRole('header', { name: 'New routine' });
    fireEvent.changeText(screen.getByLabelText('Routine name'), 'Arms');
    act(() => useRoutineDraftStore.getState().add('bicep-curl-dumbbell', 'weighted'));

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    expect(repositories.routines.save).toHaveBeenCalledWith('user-1', {
      routineId: null,
      name: 'Arms',
      items: [expect.objectContaining({ exerciseId: 'bicep-curl-dumbbell', targetSets: 3, targetReps: 10 })],
    });
    expect(toast.success).toHaveBeenCalledWith('Routine saved', expect.anything());
  });
});

describe('a saved routine', () => {
  it('opens to edit, its exercises in order with what each asks for', async () => {
    edit('push');

    expect(await screen.findByRole('header', { name: 'Edit routine' })).toBeTruthy();
    expect(screen.getByLabelText('Routine name').props.value).toBe('Push Day');
    expect(names()).toEqual(['Bench Press (Barbell)', 'Incline Bench Press (Dumbbell)']);
    expect(screen.getByText('4 sets × 8 reps · Chest')).toBeTruthy();
  });

  it('moves an exercise up or down, and takes one out', async () => {
    edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });

    expect(screen.getByRole('button', { name: 'Move Bench Press (Barbell) up' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Move Incline Bench Press (Dumbbell) up' }));
    expect(names()).toEqual(['Incline Bench Press (Dumbbell)', 'Bench Press (Barbell)']);

    fireEvent.press(screen.getByRole('button', { name: 'Remove Bench Press (Barbell)' }));
    expect(names()).toEqual(['Incline Bench Press (Dumbbell)']);
  });

  it('saves what was changed, in the new order', async () => {
    const { repositories } = edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });
    fireEvent.press(screen.getByRole('button', { name: 'Move Bench Press (Barbell) down' }));

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
    const saved = repositories.routines.save.mock.calls[0]?.[1] as { items: RoutineDraftItem[] };
    expect(saved.items.map((one) => one.exerciseId)).toEqual([
      'incline-bench-press-dumbbell',
      'bench-press-barbell',
    ]);
  });

  it('is deleted only once that is confirmed', async () => {
    const { repositories } = edit('push');
    fireEvent.press(await screen.findByRole('button', { name: 'Delete routine' }));
    expect(repositories.routines.remove).not.toHaveBeenCalled();

    answerAlert('Delete');

    await waitFor(() => expect(repositories.routines.remove).toHaveBeenCalledWith('user-1', 'push'));
    await waitFor(() => expect(actions.goBack).toHaveBeenCalled());
  });

  it('says when it is not there', async () => {
    edit('gone');

    expect(await screen.findByText('Routine not found')).toBeTruthy();
  });

  it('says so too for a link to no routine, rather than opening a new one', async () => {
    edit(null);

    expect(await screen.findByText('Routine not found')).toBeTruthy();
    expect(screen.queryByLabelText('Routine name')).toBeNull();
  });
});

describe('leaving', () => {
  it('goes straight back when nothing was changed', async () => {
    edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });

    fireEvent.press(screen.getByLabelText('Back'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(actions.goBack).toHaveBeenCalled();
  });

  it('asks before throwing changes away', async () => {
    edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });
    fireEvent.changeText(screen.getByLabelText('Routine name'), 'Push');

    fireEvent.press(screen.getByLabelText('Back'));
    expect(actions.goBack).not.toHaveBeenCalled();
    answerAlert('Discard');

    expect(actions.goBack).toHaveBeenCalled();
  });
});

describe('a draft that outlives its screen', () => {
  it('keeps what was changed while another screen is over the editor', async () => {
    const { rerender } = edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });
    fireEvent.press(screen.getByRole('button', { name: 'Move Bench Press (Barbell) down' }));

    rerender(editor('push', 'hidden'));
    rerender(editor('push'));

    expect(names()).toEqual(['Incline Bench Press (Dumbbell)', 'Bench Press (Barbell)']);
  });

  it('opens ready when it takes the place of an editor that is going', async () => {
    const { rerender } = edit('push');
    await screen.findByRole('header', { name: 'Edit routine' });

    rerender(editor('push', 'visible', 'remounted'));

    expect(await screen.findByLabelText('Routine name')).toBeTruthy();
  });
});

describe('when saving goes wrong', () => {
  it('says why a routine cannot be saved, and stays', async () => {
    edit('push', (fakes) =>
      fakes.routines.save.mockResolvedValue({ ok: false, reason: 'Give the routine a name' }),
    );
    await screen.findByRole('header', { name: 'Edit routine' });
    fireEvent.changeText(screen.getByLabelText('Routine name'), ' ');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Give the routine a name')).toBeTruthy();
    expect(actions.goBack).not.toHaveBeenCalled();
  });

  it('says briefly when it could not be written, and keeps the changes', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    edit('push', (fakes) => fakes.routines.save.mockRejectedValue(new Error('disk')));
    await screen.findByRole('header', { name: 'Edit routine' });
    fireEvent.changeText(screen.getByLabelText('Routine name'), 'Push');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Couldn't save", expect.anything()));
    expect(actions.goBack).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Routine name').props.value).toBe('Push');
    expect(logged).toHaveBeenCalled();
  });
});
