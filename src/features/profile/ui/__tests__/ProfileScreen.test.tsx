import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { ProfileScreen } from '../ProfileScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Thursday 1 Oct 2026: the chart's twelve weeks run from Monday 13 Jul to this week (from Monday 28 Sep).
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-01' }));

type Repositories = ReturnType<typeof createFakeRepositories>;

const initialAuth = useAuthStore.getState();

const summary = (date: string, minutes: number, volumeKg: number, reps: number): WorkoutSummary => ({
  id: `w-${date}`,
  name: 'Push Day',
  date: date as ISODate,
  startedAt: `${date}T18:00:00.000Z`,
  durationSeconds: minutes * 60,
  volumeKg,
  sets: 10,
  reps,
  exercises: [],
  dayLevel: 2,
});

function profile({ prepare = (_repositories: Repositories) => undefined as void } = {}) {
  const repositories = createFakeRepositories();
  repositories.workouts.historyBetween.mockResolvedValue([
    summary('2026-09-14', 50, 3000, 90),
    summary('2026-09-29', 40, 2000, 60),
    summary('2026-10-01', 22, 820, 52),
  ]);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<ProfileScreen />, 'light', { wrapper: Wrapper });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('the weekly chart', () => {
  it("reads the person's own last twelve weeks of workouts", async () => {
    const { repositories } = profile();

    expect(await screen.findByText('2,820 kg')).toBeTruthy();
    expect(repositories.workouts.historyBetween).toHaveBeenCalledWith('user-1', '2026-07-13', '2026-10-01');
  });

  it("leads with this week's volume, and labels the chart for a screen reader", async () => {
    profile();

    expect(await screen.findByText('2,820 kg')).toBeTruthy();
    expect(screen.getByText('this week')).toBeTruthy();
    expect(screen.getByLabelText('Weekly volume, last 12 weeks, 2,820 kg this week')).toBeTruthy();
  });

  it('switches to duration and to reps', async () => {
    profile();
    await screen.findByText('2,820 kg');

    fireEvent.press(screen.getByRole('radio', { name: 'Duration' }));
    expect(screen.getByText('62 min')).toBeTruthy();
    expect(screen.getByLabelText('Weekly duration, last 12 weeks, 62 min this week')).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: 'Reps' }));
    expect(screen.getByText('112 reps')).toBeTruthy();
  });

  it('shows volume in the unit the person chose', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    profile();

    expect(await screen.findByText('6,217 lb')).toBeTruthy();
  });

  it('says zero for a week with no workout, rather than nothing', async () => {
    profile({ prepare: (fakes) => void fakes.workouts.historyBetween.mockResolvedValue([]) });

    expect(await screen.findByText('0 kg')).toBeTruthy();
  });

  it('says briefly when the workouts could not be read, and tries again', async () => {
    profile({
      prepare: (fakes) =>
        void fakes.workouts.historyBetween
          .mockRejectedValueOnce(new Error('disk'))
          .mockResolvedValue([summary('2026-09-29', 40, 2000, 60)]),
    });

    expect(await screen.findByText("Couldn't load your weeks")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('2,000 kg')).toBeTruthy();
  });
});

describe('the dashboard', () => {
  it.each([
    ['Records', actions.openRecords],
    ['Exercises', actions.openExerciseLibrary],
    ['Calendar', actions.openCalendar],
  ])('opens %s', async (label, action) => {
    profile();

    fireEvent.press(await screen.findByRole('button', { name: label }));

    expect(action).toHaveBeenCalled();
  });
});

describe('the bodyweight card', () => {
  it('shows the bodyweight, and the BMI it makes with the height', async () => {
    act(() => useTrainingPreferencesStore.setState({ bodyweightKg: 70, heightCm: 170 }));
    profile();

    expect(await screen.findByRole('header', { name: 'Bodyweight · BMI' })).toBeTruthy();
    expect(screen.getByTestId('profile-bodyweight')).toHaveTextContent('70');
    expect(screen.getByText('kg')).toBeTruthy();
    // 70 / 1.7² = 24.2, one phrase for a screen reader.
    expect(screen.getByLabelText('BMI 24.2, Normal weight')).toBeTruthy();
    expect(
      screen.getByText(
        'BMI is a rough estimate for adults and does not reflect individual health. Not medical advice.',
      ),
    ).toBeTruthy();
  });

  it('names the band the BMI falls in', async () => {
    act(() => useTrainingPreferencesStore.setState({ bodyweightKg: 95, heightCm: 175 }));
    profile();

    expect(await screen.findByLabelText('BMI 31.0, Obese')).toBeTruthy();
  });

  it('shows the bodyweight in pounds when they are the unit', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb', bodyweightKg: 70 }));
    profile();

    expect(await screen.findByTestId('profile-bodyweight')).toHaveTextContent('154.3');
    expect(screen.getByText('lb')).toBeTruthy();
  });

  it.each([
    ['Log weight', actions.openLogWeight],
    ['FFMI', actions.openFfmi],
  ])('opens %s', async (label, action) => {
    profile();

    fireEvent.press(await screen.findByRole('button', { name: label }));

    expect(action).toHaveBeenCalled();
  });
});
