import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import type { Workout } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import { workoutKeys } from '../../hooks/useWorkoutQueries';
import { useActiveWorkoutViewModel } from '../useActiveWorkoutViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initialAuth = useAuthStore.getState();

const workoutWith = (status: 'pending' | 'done'): Workout => ({
  id: 'w1',
  name: 'Workout',
  routineId: null,
  date: '2026-10-01' as ISODate,
  startedAt: '2026-10-01T09:00:00.000Z',
  endedAt: null,
  bodyweightKg: 70,
  exercises: [
    {
      id: 'we1',
      exerciseId: 'squat-barbell',
      name: 'Squat (Barbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [
        {
          id: 's1',
          position: 0,
          weightKg: 100,
          reps: 5,
          seconds: null,
          status,
          setType: 'normal',
          rpe: null,
          note: null,
        },
      ],
    },
  ],
});

async function open(workout: Workout) {
  const repositories = createFakeRepositories();
  repositories.workouts.active.mockResolvedValue(workout);
  const { Wrapper, queryClient } = createWrapper(repositories);
  const hook = renderHook(() => useActiveWorkoutViewModel(), { wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current.workout).not.toBeNull());
  return { ...hook, repositories, queryClient };
}

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('finishing', () => {
  it('saves a workout with something completed', async () => {
    const { result, repositories } = await open(workoutWith('done'));

    act(() => result.current.onFinish());

    await waitFor(() => expect(repositories.workouts.finish).toHaveBeenCalledWith('w1'));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('offers to discard instead of saving a workout where nothing was completed', async () => {
    const { result, repositories } = await open(workoutWith('pending'));

    act(() => result.current.onFinish());

    expect(Alert.alert).toHaveBeenCalledWith(
      'Nothing completed yet',
      expect.stringContaining('Tick a set'),
      expect.any(Array),
    );
    expect(repositories.workouts.finish).not.toHaveBeenCalled();
  });
});

describe('after saving', () => {
  it("refreshes Home's wave and feed, so the workout is there when you arrive", async () => {
    const { result, queryClient } = await open(workoutWith('done'));
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    act(() => result.current.onFinish());

    // Tabs stay mounted, so without this Home would show the old day until its cache went stale.
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: workoutKeys.history }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: workoutKeys.days });
  });
});

describe('ticking a set', () => {
  const statusOf = (workout: Workout | null | undefined) => workout?.exercises[0]?.sets[0]?.status;

  it('shows the tick before it is stored', async () => {
    const { result, repositories } = await open(workoutWith('pending'));
    let store: (workout: Workout) => void = () => undefined;
    repositories.workouts.setStatus.mockReturnValue(new Promise<Workout>((resolve) => (store = resolve)));

    act(() => result.current.onTickSet('s1', true));

    expect(statusOf(result.current.workout)).toBe('done');
    await act(async () => store(workoutWith('done')));
    expect(statusOf(result.current.workout)).toBe('done');
  });

  it('takes the tick back when it could not be stored', async () => {
    const { result, repositories } = await open(workoutWith('pending'));
    repositories.workouts.setStatus.mockRejectedValue(new Error('disk full'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    act(() => result.current.onTickSet('s1', true));

    expect(statusOf(result.current.workout)).toBe('done');
    await waitFor(() => expect(statusOf(result.current.workout)).toBe('pending'));
  });
});

describe('leaving', () => {
  it('keeps showing the discarded workout while the screen slides away', async () => {
    const { result, repositories } = await open(workoutWith('pending'));

    act(() => result.current.onDiscardNow());

    await waitFor(() => expect(repositories.workouts.discard).toHaveBeenCalledWith('w1'));
    await waitFor(() => expect(result.current.workout?.id).toBe('w1'));
    expect(result.current.exercises).toHaveLength(1);
  });
});
