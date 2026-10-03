import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useHomeViewModel } from '@/features/home/ui/useHomeViewModel';
import type { Workout, WorkoutSet } from '@/features/workouts/data/WorkoutRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import { useRestTimerStore } from '@/features/workouts/state/restTimerStore';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import { useActiveWorkoutViewModel } from '../useActiveWorkoutViewModel';
import { useWorkoutViewModel } from '../useWorkoutViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

/**
 * How often the screens behind a workout redraw. Logging is the app's busiest moment: a clock ticking
 * or a digit typed must redraw only what shows it, not the whole workout or the tabs underneath.
 */

const NOW = new Date(2026, 9, 2, 18, 0, 0).getTime();
const initialAuth = useAuthStore.getState();

const set = (over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 's1',
  position: 0,
  weightKg: 60,
  reps: 8,
  seconds: null,
  status: 'pending',
  setType: 'normal',
  rpe: null,
  note: null,
  ...over,
});

const workoutWith = (one: WorkoutSet): Workout => ({
  id: 'w1',
  name: 'Push Day',
  routineId: null,
  date: '2026-10-02' as ISODate,
  startedAt: new Date(NOW - 12 * 60 * 1000).toISOString(),
  endedAt: null,
  bodyweightKg: 70,
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench-press-barbell',
      name: 'Bench Press (Barbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [one],
    },
  ],
});

/** Runs the clock a quarter-second at a time, so each tick is drawn as it would be on the phone. */
function runClock(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 250) {
    act(() => jest.advanceTimersByTime(250));
  }
}

function counted<T>(hook: () => T) {
  const counter = { renders: 0 };
  const run = () => {
    counter.renders += 1;
    return hook();
  };
  return { counter, run };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useRestTimerStore.setState({ workoutId: null, endsAt: null });
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the workout in progress', () => {
  it('does not redraw itself while its clocks run', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.active.mockResolvedValue(workoutWith(set()));
    const { Wrapper } = createWrapper(repositories);
    const { counter, run } = counted(useActiveWorkoutViewModel);
    const { result } = renderHook(run, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.workout).not.toBeNull());

    counter.renders = 0;
    runClock(5_000);
    expect(counter.renders).toBe(0);

    // A rest under way counts down in its own bar, not through the whole screen.
    act(() => useRestTimerStore.getState().start('w1', 90, Date.now()));
    counter.renders = 0;
    runClock(5_000);
    expect(counter.renders).toBe(0);
  });
});

describe('the tabs under the workout', () => {
  it('are not redrawn as a set is typed, only when a set is ticked', async () => {
    const repositories = createFakeRepositories();
    repositories.workouts.active.mockResolvedValue(workoutWith(set()));
    const { Wrapper, queryClient } = createWrapper(repositories);
    const home = counted(useHomeViewModel);
    const tab = counted(useWorkoutViewModel);
    const { result: homeView } = renderHook(home.run, { wrapper: Wrapper });
    const { result: tabView } = renderHook(tab.run, { wrapper: Wrapper });
    await waitFor(() => expect(homeView.current.active).not.toBeNull());
    await waitFor(() => expect(tabView.current.inProgress).not.toBeNull());
    const key = workoutKeys.active('user-1');

    home.counter.renders = 0;
    tab.counter.renders = 0;
    act(() => queryClient.setQueryData(key, workoutWith(set({ weightKg: 62.5 }))));
    act(() => queryClient.setQueryData(key, workoutWith(set({ weightKg: 62.5, reps: 10 }))));
    expect(home.counter.renders).toBe(0);
    expect(tab.counter.renders).toBe(0);

    act(() => queryClient.setQueryData(key, workoutWith(set({ weightKg: 62.5, status: 'done' }))));
    expect(homeView.current.active?.meta).toContain('1 set done');
  });
});
