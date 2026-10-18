import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { PersonalRecord } from '@/features/workouts/domain/records';
import { usePrefetchAllRecords, workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
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

describe('the Records summary, kept between visits', () => {
  // Folding every set into one row per exercise is the slow read: it must not run again as Records slides in.
  const RECORDS_KEY = [...workoutKeys.history, 'user-1', 'records-all'];

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('is not read again when Records opens later, however long after', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.records.mockResolvedValue(RECORDS);
    const { Wrapper } = createWrapper(repositories);
    const first = renderInScheme(<RecordsScreen />, 'light', { wrapper: Wrapper });
    expect(await screen.findByText('Plank')).toBeTruthy();
    first.unmount();

    // Ten minutes on: well past the 30 s after which other reads count as stale.
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 10 * 60_000);
    renderInScheme(<RecordsScreen />, 'light', { wrapper: Wrapper });

    expect(await screen.findByText('Plank')).toBeTruthy();
    expect(repositories.workouts.records).toHaveBeenCalledTimes(1);
  });

  it('is read again once a workout changes it', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.records.mockResolvedValue(RECORDS);
    const { Wrapper, queryClient } = createWrapper(repositories);
    renderInScheme(<RecordsScreen />, 'light', { wrapper: Wrapper });
    expect(await screen.findByText('Plank')).toBeTruthy();

    await act(() => queryClient.invalidateQueries({ queryKey: workoutKeys.history }));

    expect(repositories.workouts.records).toHaveBeenCalledTimes(2);
  });

  it('is folded ahead, in a quiet moment, by the screen that opens Records', async () => {
    jest.useFakeTimers();
    const repositories = createFakeRepositories();
    repositories.workouts.records.mockResolvedValue(RECORDS);
    const { Wrapper, queryClient } = createWrapper(repositories);
    renderHook(() => usePrefetchAllRecords('user-1'), { wrapper: Wrapper });
    expect(repositories.workouts.records).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    expect(queryClient.getQueryData(RECORDS_KEY)).toEqual(RECORDS);
    renderInScheme(<RecordsScreen />, 'light', { wrapper: Wrapper });
    expect(screen.getByText('Plank')).toBeTruthy();
    expect(repositories.workouts.records).toHaveBeenCalledTimes(1);
  });
});

