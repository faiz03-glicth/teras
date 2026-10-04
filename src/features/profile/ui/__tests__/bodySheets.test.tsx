import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import * as actions from '@/shared/actions';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';
import { renderInScheme } from '@test/render';

import { FfmiSheet } from '../FfmiSheet';
import { LogWeightSheet } from '../LogWeightSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Monday 5 Oct 2026.
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-05' }));

const initialAuth = useAuthStore.getState();

function open(sheet: 'weight' | 'ffmi') {
  const repositories = createFakeRepositories();
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(sheet === 'weight' ? <LogWeightSheet /> : <FfmiSheet />, 'light', {
    wrapper: Wrapper,
  });
  return { ...view, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({
      unit: 'kg',
      bodyweightKg: 70,
      heightCm: 170,
      bodyFatPercent: 18,
    });
  });
});

describe('the Log weight sheet', () => {
  it('starts at the current bodyweight and steps by a tenth', async () => {
    open('weight');

    expect(await screen.findByTestId('log-weight-value')).toHaveTextContent('70 kg');
    fireEvent.press(screen.getByRole('button', { name: 'Increase bodyweight' }));
    fireEvent.press(screen.getByRole('button', { name: 'Increase bodyweight' }));
    expect(screen.getByTestId('log-weight-value')).toHaveTextContent('70.2 kg');
  });

  it("changes nothing until Save: closing it leaves today's bodyweight as it was", async () => {
    const { repositories } = open('weight');
    fireEvent.press(await screen.findByRole('button', { name: 'Increase bodyweight' }));

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(actions.goBack).toHaveBeenCalled();
    expect(repositories.bodyweight.log).not.toHaveBeenCalled();
    expect(useTrainingPreferencesStore.getState().bodyweightKg).toBe(70);
  });

  it("saves today's weigh-in, makes it the bodyweight workouts use, says so, and closes", async () => {
    const { repositories } = open('weight');
    const increase = await screen.findByRole('button', { name: 'Increase bodyweight' });
    for (let tap = 0; tap < 5; tap++) fireEvent.press(increase);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(repositories.bodyweight.log).toHaveBeenCalledWith('user-1', '2026-10-05', 70.5),
    );
    expect(useTrainingPreferencesStore.getState().bodyweightKg).toBe(70.5);
    expect(toast.success).toHaveBeenCalledWith(
      'Weight logged',
      expect.objectContaining({ description: '70.5 kg' }),
    );
    expect(actions.goBack).toHaveBeenCalled();
  });

  it("logs a guest's weight for nobody in particular, on this phone", async () => {
    act(() =>
      useAuthStore.setState({ status: 'guest', user: testUser({ id: 'guest-1', provider: 'guest' }) }),
    );
    const { repositories } = open('weight');

    fireEvent.press(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(repositories.bodyweight.log).toHaveBeenCalledWith(null, '2026-10-05', 70));
  });

  it('shows pounds when they are the unit, and keeps the kilograms underneath', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb', bodyweightKg: 70 }));
    const { repositories } = open('weight');

    expect(await screen.findByTestId('log-weight-value')).toHaveTextContent('154.3 lb');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(repositories.bodyweight.log).toHaveBeenCalledWith('user-1', '2026-10-05', 70));
  });

  it('says so, and stays open, when the weigh-in could not be kept', async () => {
    const failing = createFakeRepositories();
    failing.bodyweight.log.mockRejectedValue(new Error('disk'));
    const { Wrapper } = createWrapper(failing);
    renderInScheme(<LogWeightSheet />, 'light', { wrapper: Wrapper });

    fireEvent.press(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Couldn't log weight", expect.anything()));
    expect(actions.goBack).not.toHaveBeenCalled();
  });
});

describe('the FFMI sheet', () => {
  it('asks for body fat and works out the index and the lean mass from it', async () => {
    open('ffmi');

    expect(await screen.findByTestId('ffmi-body-fat-value')).toHaveTextContent('18 %');
    // Lean mass 70 × 0.82 = 57.4 kg; 57.4 / 1.7² + 6.1 × 0.1 = 20.5.
    expect(screen.getByLabelText('FFMI, 20.5')).toBeTruthy();
    expect(screen.getByLabelText('Lean mass, 57.4 kg')).toBeTruthy();
  });

  it('follows the body fat as it is stepped, and keeps it', async () => {
    open('ffmi');
    fireEvent.press(await screen.findByRole('button', { name: 'Higher body fat' }));
    fireEvent.press(screen.getByRole('button', { name: 'Higher body fat' }));

    expect(screen.getByTestId('ffmi-body-fat-value')).toHaveTextContent('20 %');
    // 70 × 0.8 = 56 kg; 56 / 2.89 + 0.61 = 19.99 → 20.0.
    expect(screen.getByLabelText('FFMI, 20.0')).toBeTruthy();
    expect(useTrainingPreferencesStore.getState().bodyFatPercent).toBe(20);
  });

  it('keeps the body fat between 3 % and 50 %', async () => {
    act(() => useTrainingPreferencesStore.setState({ bodyFatPercent: 50 }));
    open('ffmi');

    fireEvent.press(await screen.findByRole('button', { name: 'Higher body fat' }));

    expect(screen.getByTestId('ffmi-body-fat-value')).toHaveTextContent('50 %');
  });

  it('says it is only an estimate, and writes nothing', async () => {
    const { repositories } = open('ffmi');

    expect(
      await screen.findByText('A rough estimate that depends on your body-fat figure. Not medical advice.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(repositories.bodyweight.log).not.toHaveBeenCalled();
    expect(actions.goBack).toHaveBeenCalled();
  });
});
