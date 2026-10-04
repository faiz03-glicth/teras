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

import { EDIT_HOLD_MS, HOLD_REPEAT_MS } from '@/shared/ui/StepperRow';
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
    it('asks with labels and values only, no explanation to read', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      expect(screen.getByRole('header', { name: 'Set up' })).toBeTruthy();
      for (const label of ['Units', 'Bodyweight', 'Height', 'Rest']) {
        // Section labels are set in caps, so match the word, not its case.
        expect(screen.getByText(new RegExp(`^${label}$`, 'i'))).toBeTruthy();
      }
      expect(screen.queryByText(/later in Profile|counts in pull-ups|Hold/i)).toBeNull();
    });

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

    it('types a value after a short hold on it, one value at a time', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      // The hold is short: well under the system's half-second long press.
      expect(EDIT_HOLD_MS).toBeLessThanOrEqual(300);

      fireEvent(screen.getByTestId('setup-bodyweight-value'), 'longPress');
      const field = screen.getByTestId('setup-bodyweight-input-0');
      expect(field.props.value).toBe('70');
      // Only the held value opens; the others stay as they read.
      expect(screen.queryByTestId('setup-height-input-0')).toBeNull();
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('170 cm');

      fireEvent.changeText(field, '82.5');
      fireEvent(field, 'submitEditing');

      expect(prefs().bodyweightKg).toBe(82.5);
      expect(screen.queryByTestId('setup-bodyweight-input-0')).toBeNull();
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('82.5 kg');
    });

    it('types height in feet and inches, and rest in minutes and seconds', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });
      fireEvent.press(screen.getByRole('radio', { name: 'Imperial, lb · ft in' }));

      fireEvent(screen.getByTestId('setup-height-value'), 'longPress');
      expect(screen.getByTestId('setup-height-input-0').props.value).toBe('5');
      expect(screen.getByTestId('setup-height-input-1').props.value).toBe('7');
      fireEvent.changeText(screen.getByTestId('setup-height-input-0'), '6');
      fireEvent.changeText(screen.getByTestId('setup-height-input-1'), '1');
      fireEvent(screen.getByTestId('setup-height-input-1'), 'submitEditing');
      expect(screen.getByTestId('setup-height-value')).toHaveTextContent('6 ft 1 in');

      fireEvent(screen.getByTestId('setup-rest-value'), 'longPress');
      fireEvent.changeText(screen.getByTestId('setup-rest-input-0'), '2');
      fireEvent.changeText(screen.getByTestId('setup-rest-input-1'), '15');
      fireEvent(screen.getByTestId('setup-rest-input-1'), 'submitEditing');
      expect(prefs().restSeconds).toBe(135);
      expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('2 min 15 s');
    });

    it('keeps the value it had when what is typed is not a number', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent(screen.getByTestId('setup-bodyweight-value'), 'longPress');
      fireEvent.changeText(screen.getByTestId('setup-bodyweight-input-0'), '');
      fireEvent(screen.getByTestId('setup-bodyweight-input-0'), 'submitEditing');

      expect(prefs().bodyweightKg).toBe(70);
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('70 kg');
    });

    it('stays open while moving from minutes to seconds, and closes once both are left', () => {
      jest.useFakeTimers();
      try {
        renderWithApp(<OnboardingScreen step={1} />, { scheme });
        fireEvent(screen.getByTestId('setup-rest-value'), 'longPress');
        const minutes = screen.getByTestId('setup-rest-input-0');
        const seconds = screen.getByTestId('setup-rest-input-1');

        // Next on minutes: Android blurs it first and focuses seconds a moment later.
        fireEvent.changeText(minutes, '2');
        fireEvent(minutes, 'submitEditing');
        fireEvent(minutes, 'blur');
        act(() => jest.advanceTimersByTime(30));
        fireEvent(seconds, 'focus');
        act(() => jest.advanceTimersByTime(1000));
        expect(screen.getByTestId('setup-rest-input-1')).toBeTruthy();
        // Kept as typed: 2 min and the 30 s already there.
        expect(prefs().restSeconds).toBe(150);

        fireEvent.changeText(seconds, '0');
        fireEvent(seconds, 'blur');
        act(() => jest.advanceTimersByTime(1000));
        expect(screen.queryByTestId('setup-rest-input-1')).toBeNull();
        expect(prefs().restSeconds).toBe(120);
        expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('2 min');
      } finally {
        jest.useRealTimers();
      }
    });

    it('saves as it is typed, so Continue straight after keeps the number', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent(screen.getByTestId('setup-height-value'), 'longPress');
      fireEvent.changeText(screen.getByTestId('setup-height-input-0'), '183');

      expect(prefs().heightCm).toBe(183);
    });

    it('goes back to where it started when the field is left on something that is not a number', () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent(screen.getByTestId('setup-bodyweight-value'), 'longPress');
      const field = screen.getByTestId('setup-bodyweight-input-0');
      // On the way to clearing it, "8" was briefly a (clamped) bodyweight.
      fireEvent.changeText(field, '8');
      fireEvent.changeText(field, '');
      fireEvent(field, 'submitEditing');

      expect(prefs().bodyweightKg).toBe(70);
      expect(screen.getByTestId('setup-bodyweight-value')).toHaveTextContent('70 kg');
    });

    it('saves what was typed when the field is left without pressing Done', async () => {
      renderWithApp(<OnboardingScreen step={1} />, { scheme });

      fireEvent(screen.getByTestId('setup-rest-value'), 'longPress');
      fireEvent.changeText(screen.getByTestId('setup-rest-input-1'), '45');
      fireEvent(screen.getByTestId('setup-rest-input-1'), 'blur');

      await waitFor(() => expect(screen.getByTestId('setup-rest-value')).toHaveTextContent('1 min 45 s'));
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
