import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import {
  DEFAULT_TRAINING_PREFERENCES,
  useTrainingPreferencesStore,
} from '@/features/training/state/trainingPreferencesStore';
import { openLogin, showOnboardingStep } from '@/shared/actions';
import { testUser } from '@test/fakes/fakeRepositories';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { HOLD_REPEAT_MS } from '../components/StepperRow';
import { OnboardingScreen } from '../OnboardingScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initialAuth = useAuthStore.getState();
const prefs = () => useTrainingPreferencesStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState(
      { ...initialAuth, status: 'signedOut', user: null, hasCompletedOnboarding: false },
      true,
    );
    useTrainingPreferencesStore.setState(DEFAULT_TRAINING_PREFERENCES);
  });
});

describe.each(SCHEMES)('Get Started in %s', (scheme) => {
  describe('Welcome', () => {
    it('continues to Set up, or to Sign in for someone who already has an account', () => {
      renderWithApp(<OnboardingScreen step={0} />, { scheme });
      expect(screen.getByRole('header', { name: 'Teras' })).toBeTruthy();
      // There is nothing before Welcome to go back to.
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

      fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
      expect(showOnboardingStep).toHaveBeenCalledWith(1);

      fireEvent.press(screen.getByTestId('onboarding-have-account'));
      expect(openLogin).toHaveBeenCalledWith('existing');
    });
  });

  describe('Set up', () => {
    it('stores each choice as it is made, so it outlives the screen', () => {
      const { unmount } = renderWithApp(<OnboardingScreen step={1} />, { scheme });

      expect(screen.getByRole('radio', { name: 'Metric, kg · cm' })).toBeChecked();
      fireEvent.press(screen.getByRole('radio', { name: 'Imperial, lb · ft in' }));
      fireEvent.press(screen.getByTestId('setup-bodyweight-plus'));
      fireEvent.press(screen.getByTestId('setup-height-plus'));
      fireEvent.press(screen.getByTestId('setup-rest-plus'));
      fireEvent.press(screen.getByTestId('setup-rest-plus'));

      expect(prefs().unit).toBe('lb');
      expect(prefs().restSeconds).toBe(100);
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('154.4 lb');
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('5 ft 8 in');
      expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('1 min 40 s');

      // Leaving and coming back (Back, Sign in, a restart) shows the same choices.
      unmount();
      renderWithApp(<OnboardingScreen step={1} />, { scheme });
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('154.4 lb');
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('5 ft 8 in');
      expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('1 min 40 s');
    });

    it('steps bodyweight by 0.1 kg and height by 1 cm', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent.press(screen.getByTestId('setup-bodyweight-plus'));
      fireEvent.press(screen.getByTestId('setup-bodyweight-plus'));
      fireEvent.press(screen.getByTestId('setup-height-minus'));

      expect(prefs().bodyweightKg).toBe(70.2);
      expect(prefs().heightCm).toBe(169);
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('70.2 kg');
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('169 cm');
    });

    it('keeps the same bodyweight and height when the units change', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });
      fireEvent.press(screen.getByRole('radio', { name: 'Imperial, lb · ft in' }));

      // Only the way they are shown changes.
      expect(prefs().bodyweightKg).toBe(70);
      expect(prefs().heightCm).toBe(170);
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('154.3 lb');
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('5 ft 7 in');
    });

    it('keeps stepping while a button is held, and stops when it is let go', () => {
      jest.useFakeTimers();
      try {
        renderWithApp(<OnboardingScreen step={1} />, { scheme });
        const plus = screen.getByTestId('setup-rest-plus');

        fireEvent(plus, 'longPress');
        act(() => jest.advanceTimersByTime(HOLD_REPEAT_MS * 4));
        expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('1 min 50 s');

        fireEvent(plus, 'pressOut');
        act(() => jest.advanceTimersByTime(HOLD_REPEAT_MS * 4));
        expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('1 min 50 s');
      } finally {
        jest.useRealTimers();
      }
    });

    it('goes on to Sign in, and back to Welcome', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
      expect(openLogin).toHaveBeenCalledWith('new');
      expect(useAuthStore.getState().hasCompletedOnboarding).toBe(false);

      fireEvent.press(screen.getByRole('button', { name: 'Back' }));
      expect(showOnboardingStep).toHaveBeenCalledWith(0);
    });

    it('finishes here for someone already in a session instead of asking them to sign in again', async () => {
      act(() => useAuthStore.getState().setUser(testUser()));
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true));
      expect(openLogin).not.toHaveBeenCalled();
    });

    it('does not offer "I already have an account" to someone already in a session', () => {
      act(() => useAuthStore.getState().setUser(testUser()));
      renderWithApp(<OnboardingScreen step={0} />, { scheme });
      expect(screen.queryByTestId('onboarding-have-account')).toBeNull();
    });
  });
});
