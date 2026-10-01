import { toast } from 'sonner-native';

import { AppError } from '@/core/errors/AppError';
import { useAuthStore } from '@/features/auth/state/authStore';
import { createFakeAuthRepository, testUser } from '@test/fakes/fakeRepositories';

import { createSessionActions } from '../session';

const initial = useAuthStore.getState();

function setup(confirmed = true) {
  const auth = createFakeAuthRepository();
  const clearCache = jest.fn();
  const confirm = jest.fn(async () => confirmed);
  const actions = createSessionActions({ auth, store: useAuthStore, clearCache, confirm });
  return { actions, auth, clearCache, confirm };
}

beforeEach(() => {
  useAuthStore.setState(initial, true);
  jest.clearAllMocks();
});

describe('finishOnboarding', () => {
  it('Welcome → Skip: creates a guest, completes onboarding and says so', async () => {
    useAuthStore.getState().setUser(null);
    const { actions, auth } = setup();
    await actions.finishOnboarding();
    expect(auth.continueAsGuest).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'guest', hasCompletedOnboarding: true });
    expect(toast.success).toHaveBeenCalledWith("You're all set", {
      id: "You're all set",
      description: 'Start a workout whenever you are ready.',
      action: undefined,
      duration: 3500,
    });
  });

  it('keeps an existing session and can finish silently', async () => {
    useAuthStore.getState().setUser(testUser());
    const { actions, auth } = setup();
    await actions.finishOnboarding({ silent: true });
    expect(auth.continueAsGuest).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', hasCompletedOnboarding: true });
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('does nothing when the person cancels', async () => {
    useAuthStore.getState().setUser(testUser());
    const { actions, auth } = setup(false);
    await actions.signOut();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('signs out, clears cached data and confirms with a toast', async () => {
    useAuthStore.getState().setUser(testUser());
    const { actions, auth, clearCache, confirm } = setup();
    await actions.signOut();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Log out?', destructive: true }));
    expect(auth.signOut).toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(toast.success).toHaveBeenCalledWith(
      'Signed out',
      expect.objectContaining({
        description: 'Your workouts stay on this device for when you sign back in.',
      }),
    );
  });

  it('warns guests that their data stays on the device', async () => {
    useAuthStore.getState().setUser(testUser({ provider: 'guest' }));
    const { actions, confirm } = setup();
    await actions.signOut();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('stay on this device') }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Signed out',
      expect.objectContaining({
        description: 'Your workouts stay on this device.',
      }),
    );
  });

  it('stays signed in and explains when offline', async () => {
    useAuthStore.getState().setUser(testUser());
    const { actions, auth } = setup();
    auth.signOut.mockRejectedValueOnce(new AppError('Network', 'offline'));
    await actions.signOut();
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(toast.info).toHaveBeenCalledWith("You're offline", expect.anything());
  });
});
