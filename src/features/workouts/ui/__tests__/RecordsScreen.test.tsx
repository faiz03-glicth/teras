import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { PersonalRecord } from '@/features/workouts/domain/records';
import * as actions from '@/shared/actions';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { RecordsScreen } from '../RecordsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const RECORDS: PersonalRecord[] = [
  { exerciseId: 'bench-press-barbell', name: 'Bench Press (Barbell)', type: 'weighted', value: 102.5 },
  { exerciseId: 'pull-up', name: 'Pull Up', type: 'bodyweight', value: 12 },
  { exerciseId: 'plank', name: 'Plank', type: 'timed', value: 75 },
];

function records({ prepare = (_repositories: Repositories) => undefined as void } = {}) {
  const repositories = createFakeRepositories();
  repositories.workouts.records.mockResolvedValue(RECORDS);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<RecordsScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('Records', () => {
  it("lists each of the person's records, worded by what it measures", async () => {
    const { repositories } = records();

    expect(await screen.findByText('Bench Press (Barbell)')).toBeTruthy();
    expect(screen.getByText('102.5 kg · heaviest weight')).toBeTruthy();
    expect(screen.getByText('12 reps · most reps')).toBeTruthy();
    expect(screen.getByText('1 min 15 s · longest hold')).toBeTruthy();
    expect(repositories.workouts.records).toHaveBeenCalledWith('user-1');
  });

  it('shows weights in the unit the person chose', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    records();

    expect(await screen.findByText('226 lb · heaviest weight')).toBeTruthy();
  });

  it('opens an exercise from its record', async () => {
    records();

    fireEvent.press(await screen.findByText('Pull Up'));

    expect(actions.openExercise).toHaveBeenCalledWith('pull-up');
  });

  it('says so plainly before there is any record', async () => {
    records({ prepare: (fakes) => void fakes.workouts.records.mockResolvedValue([]) });

    expect(await screen.findByText('No records yet')).toBeTruthy();
  });

  it('says briefly when the records could not be read, and tries again', async () => {
    records({
      prepare: (fakes) =>
        void fakes.workouts.records.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(RECORDS),
    });

    expect(await screen.findByText("Couldn't load your records")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Plank')).toBeTruthy();
  });

  it('goes back to Profile', async () => {
    records();

    fireEvent.press(await screen.findByLabelText('Back'));

    expect(actions.goBack).toHaveBeenCalled();
  });
});
