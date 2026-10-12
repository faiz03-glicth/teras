import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import * as actions from '@/shared/actions';
import { addDays } from '@/shared/lib/date/calendar';
import { toISODate } from '@/shared/lib/date/isoDate';
import { LIBRARY } from '@test/fakes/exerciseRows';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { RoutinePreviewScreen } from '../RoutinePreviewScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initialAuth = useAuthStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
  });
});

const item = (key: string, exerciseId: string, targetSets: number, held = false) => ({
  key,
  exerciseId,
  targetSets,
  targetReps: held ? null : 8,
  targetSeconds: held ? 60 : null,
  startWeightKg: null,
});

function preview(id: string | null = 'push') {
  const repositories = createFakeRepositories();
  repositories.exercises.list.mockResolvedValue(LIBRARY);
  repositories.routines.get.mockResolvedValue({
    routineId: 'push',
    name: 'Push Day',
    items: [item('a', 'bench-press-barbell', 4), item('b', 'plank', 3, true), item('c', 'squat-barbell', 3)],
  });
  repositories.workouts.routines.mockResolvedValue([
    {
      id: 'push',
      name: 'Push Day',
      exerciseCount: 3,
      exercises: [],
      last: { date: addDays(toISODate(new Date()), -1), level: 4 },
    },
  ]);
  repositories.workouts.toBeat.mockResolvedValue({
    'bench-press-barbell': { weightKg: 80, reps: 8, seconds: 0 },
    plank: { weightKg: 0, reps: 0, seconds: 60 },
  });
  const { Wrapper } = createWrapper(repositories);
  renderInScheme(<RoutinePreviewScreen id={id} />, 'light', { wrapper: Wrapper });
  return repositories;
}

describe('a routine before it starts', () => {
  it('says what it holds and how the last time went', async () => {
    preview();

    expect(await screen.findByText('Push Day')).toBeTruthy();
    expect(screen.getByText('3 exercises · 10 sets')).toBeTruthy();
    expect(screen.getByText('Last time: Peak · yesterday')).toBeTruthy();
  });

  it('gives each exercise last week’s best and what beats it', async () => {
    preview();

    expect(await screen.findByText('4 sets · last 80 kg × 8')).toBeTruthy();
    expect(screen.getByText('80 kg × 9')).toBeTruthy();
    expect(screen.getByText('or 82.5 kg × 5+')).toBeTruthy();
    expect(screen.getByText('3 sets · last 60 s')).toBeTruthy();
    expect(screen.getByText('65 s')).toBeTruthy();
    expect(screen.getByText('3 sets · nothing to beat yet')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Bench Press (Barbell). 4 sets, last week 80 kg × 8. To beat: 80 kg × 9, or 82.5 kg × 5+.',
      ),
    ).toBeTruthy();
  });

  it('starts it, or opens it to edit', async () => {
    const repositories = preview();

    fireEvent.press(await screen.findByRole('button', { name: 'Start Push Day' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit Push Day' }));

    await waitFor(() =>
      expect(repositories.workouts.start).toHaveBeenCalledWith(
        testUser().id,
        expect.objectContaining({ routineId: 'push' }),
      ),
    );
    expect(actions.openRoutine).toHaveBeenCalledWith('push');
  });

  it('says so when the routine is gone', async () => {
    preview(null);

    expect(await screen.findByText('Routine not found')).toBeTruthy();
    expect(screen.queryByTestId('routine-preview-start')).toBeNull();
  });
});
