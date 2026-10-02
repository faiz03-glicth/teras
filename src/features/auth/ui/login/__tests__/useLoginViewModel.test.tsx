import { act, renderHook, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { AuthError } from '@/features/auth/domain/AuthError';
import { MESSAGES } from '@/features/auth/domain/authFeedback';
import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack, openLegal, openOnboarding } from '@/shared/actions';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import type { AuthIntent } from '../../../domain/types';
import { useLoginViewModel } from '../useLoginViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initial = useAuthStore.getState();

/** Renders the ViewModel and lets the Apple-availability query settle. */
async function setup(intent: AuthIntent = 'new', repositories = createFakeRepositories()) {
  const { Wrapper } = createWrapper(repositories);
  const hook = renderHook(() => useLoginViewModel(intent), { wrapper: Wrapper });
  await act(async () => undefined);
  return { ...hook, repositories };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ...initial, status: 'signedOut' }, true);
});

describe('useLoginViewModel', () => {
  it('shows Skip only for new people and the matching heading', async () => {
    expect((await setup('new')).result.current).toMatchObject({
      showSkip: true,
      heading: { title: 'Sign in' },
    });
    expect((await setup('existing')).result.current).toMatchObject({
      showSkip: false,
      heading: { title: 'Welcome back' },
    });
  });

  it('offers Apple only when the device supports it', async () => {
    const repositories = createFakeRepositories();
    repositories.auth.isAppleAvailable.mockResolvedValue(false);
    const { result } = await setup('new', repositories);
    await waitFor(() => expect(repositories.auth.isAppleAvailable).toHaveBeenCalled());
    expect(result.current.showApple).toBe(false);
  });

  it('a pending sign-in makes everything else busy and ignores further taps', async () => {
    const { result, repositories } = await setup();
    act(() => useAuthStore.getState().setPendingProvider('google'));
    expect(result.current).toMatchObject({ busy: true, busyProvider: 'google' });
    act(() => result.current.onApple());
    act(() => result.current.onSkip());
    act(() => result.current.onContinueWithEmail());
    act(() => result.current.onBack());
    expect(repositories.auth.signInWithApple).not.toHaveBeenCalled();
    expect(repositories.auth.continueAsGuest).not.toHaveBeenCalled();
    expect(result.current.step).toBe('providers');
    expect(goBack).not.toHaveBeenCalled();
  });

  it('walks providers → email → code and back again', async () => {
    const { result, repositories } = await setup();
    act(() => result.current.onContinueWithEmail());
    expect(result.current).toMatchObject({ step: 'email', heading: { title: 'Continue with email' } });

    act(() => result.current.onEmailChange('Person@Example.com'));
    expect(result.current.emailValid).toBe(true);
    await act(async () => result.current.onSendCode());
    expect(repositories.auth.requestEmailOtp).toHaveBeenCalledWith('person@example.com');
    expect(result.current).toMatchObject({
      step: 'code',
      heading: { subtitle: 'Enter the code sent to person@example.com' },
    });

    act(() => result.current.onBack());
    expect(result.current.step).toBe('email');
    act(() => result.current.onBack());
    expect(result.current.step).toBe('providers');
    act(() => result.current.onBack());
    expect(goBack).toHaveBeenCalledWith(expect.any(Function));
  });

  it('keeps Send code disabled for an invalid email', async () => {
    const { result, repositories } = await setup();
    act(() => result.current.onContinueWithEmail());
    act(() => result.current.onEmailChange('not-an-email'));
    expect(result.current.emailValid).toBe(false);
    await act(async () => result.current.onSendCode());
    expect(repositories.auth.requestEmailOtp).not.toHaveBeenCalled();
  });

  it('counts down 60 seconds before a code can be resent', async () => {
    jest.useFakeTimers();
    try {
      const { result, repositories } = await setup();
      act(() => result.current.onContinueWithEmail());
      act(() => result.current.onEmailChange('a@b.co'));
      await act(async () => result.current.onSendCode());
      expect(result.current).toMatchObject({ canResend: false, resendLabel: 'Resend code (1:00)' });

      act(() => jest.advanceTimersByTime(1000));
      expect(result.current.resendLabel).toBe('Resend code (0:59)');
      act(() => result.current.onResend());
      expect(repositories.auth.requestEmailOtp).toHaveBeenCalledTimes(1);

      for (let i = 0; i < 59; i += 1) act(() => jest.advanceTimersByTime(1000));
      expect(result.current).toMatchObject({ canResend: true, resendLabel: 'Resend code' });
      await act(async () => result.current.onResend());
      expect(repositories.auth.requestEmailOtp).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows nothing when the person cancels, and a banner when offline', async () => {
    const { result, repositories } = await setup();
    repositories.auth.signInWithGoogle.mockRejectedValueOnce(new AuthError('Cancelled'));
    await act(async () => result.current.onGoogle());
    expect(result.current.banner).toBeNull();

    repositories.auth.signInWithGoogle.mockRejectedValueOnce(new AuthError('Network'));
    await act(async () => result.current.onGoogle());
    expect(result.current.banner).toBe(MESSAGES.offline);

    // The banner clears on the next attempt.
    repositories.auth.signInWithGoogle.mockImplementationOnce(() => new Promise(() => undefined));
    act(() => result.current.onGoogle());
    expect(result.current.banner).toBeNull();
  });

  it('shows a wrong code under the field, not as a banner', async () => {
    const { result, repositories } = await setup();
    repositories.auth.verifyEmailOtp.mockRejectedValueOnce(new AuthError('InvalidOtp'));
    act(() => result.current.onEmailChange('a@b.co'));
    await act(async () => result.current.onCodeComplete('000000'));
    expect(result.current).toMatchObject({ codeError: MESSAGES.invalidCode, banner: null });
    act(() => result.current.onCodeChange('1'));
    expect(result.current.codeError).toBeNull();
  });

  it('signing in is the last step of Get Started: it finishes onboarding, so the guard opens Home', async () => {
    const { result } = await setup('new');
    await act(async () => result.current.onGoogle());
    expect(openOnboarding).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', hasCompletedOnboarding: true });
  });

  it('skipping continues as a guest and finishes Get Started too', async () => {
    const { result, repositories } = await setup('new');
    await act(async () => result.current.onSkip());
    expect(repositories.auth.continueAsGuest).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'guest', hasCompletedOnboarding: true });
    // Guests get no "signed in" toast.
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('a failed sign-in leaves Get Started unfinished, so the person can try again', async () => {
    const repositories = createFakeRepositories();
    repositories.auth.signInWithGoogle.mockRejectedValueOnce(new AuthError('Network', 'offline'));
    const { result } = await setup('new', repositories);
    await act(async () => result.current.onGoogle());
    expect(result.current.banner).toBe(MESSAGES.offline);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', hasCompletedOnboarding: false });

    await act(async () => result.current.onGoogle());
    expect(result.current.banner).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', hasCompletedOnboarding: true });
  });

  it('returning people go straight in with a welcome toast', async () => {
    const repositories = createFakeRepositories();
    repositories.auth.signInWithApple.mockResolvedValueOnce(
      testUser({ provider: 'apple', displayName: 'Faiz Ahmad' }),
    );
    const { result } = await setup('existing', repositories);
    await act(async () => result.current.onApple());
    expect(openOnboarding).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', hasCompletedOnboarding: true });
    expect(toast.success).toHaveBeenCalledWith(
      'Signed in with Apple',
      expect.objectContaining({ description: 'Welcome, Faiz.' }),
    );
  });

  it('opens the legal documents', async () => {
    const { result } = await setup();
    result.current.onTerms();
    result.current.onPrivacy();
    expect(jest.mocked(openLegal).mock.calls).toEqual([['terms'], ['privacy']]);
  });
});
