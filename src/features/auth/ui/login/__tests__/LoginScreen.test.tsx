import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack, openLegal } from '@/shared/actions';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { LoginScreen } from '../LoginScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initial = useAuthStore.getState();
const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ...initial, status: 'signedOut' }, true);
});
afterEach(() => {
  Platform.OS = originalOS;
});

describe.each(SCHEMES)('LoginScreen in %s', (scheme) => {
  it('new: title, benefits, providers, Skip and legal footer', async () => {
    renderWithApp(<LoginScreen intent="new" />, { scheme });
    expect(screen.getByRole('header', { name: 'Keep your wave safe' })).toBeTruthy();
    expect(screen.getByText('Your training in Streak')).toBeTruthy();
    expect(screen.getByText('One account for both apps')).toBeTruthy();
    expect(screen.getByText('Private by default')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Sign in with Apple' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Terms' })).toBeTruthy();
  });

  it('existing: returning-user title and no Skip', async () => {
    renderWithApp(<LoginScreen intent="existing" />, { scheme });
    await screen.findByRole('button', { name: 'Sign in with Apple' });
    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  });
});

describe('LoginScreen behaviour', () => {
  it('has no Apple button on Android', async () => {
    Platform.OS = 'android';
    renderWithApp(<LoginScreen intent="new" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Sign in with Apple' })).toBeNull();
  });

  it('while Google connects: "Connecting…", everything else disabled', async () => {
    renderWithApp(<LoginScreen intent="new" />);
    await screen.findByRole('button', { name: 'Sign in with Apple' });
    act(() => useAuthStore.getState().setPendingProvider('google'));

    expect(screen.getByRole('button', { name: 'Connecting…' }).props.accessibilityState).toMatchObject({
      busy: true,
    });
    for (const name of ['Continue with email', 'Skip for now', 'Back']) {
      expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
    }
    expect(screen.getByTestId('apple-sso').props.pointerEvents).toBe('none');
  });

  it('every Phase 1 button calls its action', async () => {
    const { repositories } = renderWithApp(<LoginScreen intent="new" />);
    await screen.findByRole('button', { name: 'Sign in with Apple' });

    fireEvent.press(screen.getByRole('link', { name: 'Terms' }));
    fireEvent.press(screen.getByRole('link', { name: 'Privacy Policy' }));
    expect(jest.mocked(openLegal).mock.calls).toEqual([['terms'], ['privacy']]);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(goBack).toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Sign in with Apple' }));
    await waitFor(() => expect(repositories.auth.signInWithApple).toHaveBeenCalled());

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(repositories.auth.signInWithGoogle).toHaveBeenCalled());

    fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(repositories.auth.continueAsGuest).toHaveBeenCalled());
  });

  it('email flow: invalid address keeps Send code disabled; six digits verify', async () => {
    const { repositories } = renderWithApp(<LoginScreen intent="existing" />);
    await screen.findByRole('button', { name: 'Sign in with Apple' });
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    expect(screen.getByRole('header', { name: 'Continue with email' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Email address'), 'nope');
    expect(screen.getByRole('button', { name: 'Send code' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });

    fireEvent.changeText(screen.getByLabelText('Email address'), 'person@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByRole('header', { name: 'Check your inbox' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Resend code \(/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });

    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    await waitFor(() =>
      expect(repositories.auth.verifyEmailOtp).toHaveBeenCalledWith('person@example.com', '123456'),
    );
    await waitFor(() => expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true));
  });
});
