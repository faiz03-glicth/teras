import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { Workout, WorkoutSet } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { WorkoutSavedScreen } from '../WorkoutSavedScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Friday 2 October 2026.
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const set = (id: string, status: WorkoutSet['status'], weightKg: number, reps: number): WorkoutSet => ({
  id,
  position: 0,
  weightKg,
  reps,
  seconds: null,
  status,
  setType: 'normal',
  rpe: null,
  note: null,
});

/** Finished with two of four sets ticked, across one of its two exercises. */
const finished = (over: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  name: 'Push Day',
  routineId: 'push',
  date: '2026-10-02' as ISODate,
  startedAt: new Date(2026, 9, 2, 18, 20).toISOString(),
  endedAt: new Date(2026, 9, 2, 19, 22).toISOString(),
  bodyweightKg: 70,
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench-press-barbell',
      name: 'Bench Press (Barbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [set('s1', 'done', 60, 8), set('s2', 'done', 62.5, 6), set('s3', 'pending', 62.5, 6)],
    },
    {
      id: 'we2',
      exerciseId: 'bicep-curl-dumbbell',
      name: 'Bicep Curl (Dumbbell)',
      type: 'weighted',
      restSeconds: 90,
      sets: [set('s4', 'pending', 14, 10)],
    },
  ],
  ...over,
});

const day = (date: string, level: WorkoutDay['level'], volumeKg = 855): WorkoutDay => ({
  date: date as ISODate,
  level,
  volumeKg,
  sets: 2,
  workouts: 1,
});

function saved(id: string | null, prepare: (repositories: Repositories) => void = () => undefined) {
  const repositories = createFakeRepositories();
  repositories.workouts.logged.mockResolvedValue(finished());
  repositories.workoutDays.list.mockResolvedValue([day('2026-09-29', 2, 600), day('2026-10-02', 3)]);
  // Five earlier training days: the median is 700 kg.
  repositories.workoutDays.windowBefore.mockResolvedValue([500, 600, 700, 800, 900]);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<WorkoutSavedScreen id={id} />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('a saved workout', () => {
  it('confirms it was saved, and names it', async () => {
    saved('w1');

    expect(await screen.findByText('Workout saved')).toBeTruthy();
    expect(screen.getByText('Push Day · Today · 18:20')).toBeTruthy();
  });

  it('adds up what was completed, against what was planned', async () => {
    saved('w1');

    // 60 × 8 + 62.5 × 6: the unticked sets were not saved.
    expect(
      await screen.findByLabelText('Duration, 62 min. Volume, 855 kg. Sets, 2/4. Exercises, 1/2'),
    ).toBeTruthy();
  });

  it('shows the level its day was recorded at, and what it was judged against', async () => {
    saved('w1');

    expect(await screen.findByText('Strong')).toBeTruthy();
    expect(screen.getByText('855 kg · your 90-day median is 700 kg')).toBeTruthy();
  });

  it('shows its week, with its day among the others', async () => {
    saved('w1');

    const week = await screen.findByTestId('saved-week');
    expect(week.props.accessibilityLabel).toContain('Sep 29: Moderate');
    expect(week.props.accessibilityLabel).toContain('Oct 2, today: Strong');
  });

  it('reads the days of that week and the 90 days before it, and changes nothing', async () => {
    const { repositories } = saved('w1');
    await screen.findByText('Strong');

    expect(repositories.workouts.logged).toHaveBeenCalledWith('user-1', 'w1');
    expect(repositories.workoutDays.list).toHaveBeenCalledWith('user-1', '2026-09-28', '2026-10-04');
    expect(repositories.workoutDays.windowBefore).toHaveBeenCalledWith('user-1', '2026-10-02');
    expect(repositories.workouts.finish).not.toHaveBeenCalled();
    expect(repositories.workoutDays.recordDay).not.toHaveBeenCalled();
  });

  it('names the personal records it set', async () => {
    saved('w1', (fakes) => {
      fakes.workouts.newRecords.mockResolvedValue([
        { exerciseId: 'bench-press-barbell', name: 'Bench Press (Barbell)', type: 'weighted', value: 62.5 },
        { exerciseId: 'plank', name: 'Plank', type: 'timed', value: 75 },
      ]);
    });

    expect(await screen.findByText('2 new personal records')).toBeTruthy();
    expect(screen.getByText('62.5 kg · heaviest weight')).toBeTruthy();
    expect(screen.getByText('1 min 15 s · longest hold')).toBeTruthy();
  });

  it('says so, briefly, when it set none', async () => {
    const { repositories } = saved('w1');

    expect(await screen.findByText('No new records this time')).toBeTruthy();
    expect(repositories.workouts.newRecords).toHaveBeenCalledWith('user-1', 'w1');
  });

  it('goes Home when done', async () => {
    saved('w1');

    fireEvent.press(await screen.findByRole('button', { name: 'Done' }));

    expect(actions.goHome).toHaveBeenCalled();
  });
});

describe('states', () => {
  it('shows that it is loading, never an empty summary', async () => {
    const { repositories } = saved('w1', (fakes) => {
      fakes.workouts.logged.mockReturnValue(new Promise(() => undefined));
    });

    await waitFor(() => expect(repositories.workouts.logged).toHaveBeenCalled());
    expect(screen.getByLabelText('Loading the workout')).toBeTruthy();
    expect(screen.queryByText('Workout saved')).toBeNull();
  });

  it('says briefly when it could not be read, and tries again', async () => {
    saved('w1', (fakes) => {
      fakes.workouts.logged.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(finished());
    });

    expect(await screen.findByText("Couldn't load this workout")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Workout saved')).toBeTruthy();
  });

  it('says so for a workout that is not there', async () => {
    saved('gone', (fakes) => {
      fakes.workouts.logged.mockResolvedValue(null);
    });

    expect(await screen.findByText('Workout not found')).toBeTruthy();
  });
});
