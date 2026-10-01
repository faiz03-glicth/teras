import { act, render, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { toast } from 'sonner-native';

import { createSessionActions } from '@/shared/actions/session';
import { AppToaster } from '@/shared/ui/AppToaster';
import { createFakeAuthRepository, testUser } from '@test/fakes/fakeRepositories';

import { useSessionScopedToasts } from '../hooks/useSessionScopedToasts';
import { useAuthStore } from '../state/authStore';

const initial = useAuthStore.getState();

beforeEach(() => {
  useAuthStore.setState(initial, true);
  jest.clearAllMocks();
});

describe('session-scoped toasts', () => {
  it('clears toasts when the person changes, not on a token refresh', () => {
    act(() => useAuthStore.getState().setUser(testUser()));
    renderHook(() => useSessionScopedToasts());

    act(() => useAuthStore.getState().applyRemoteSession(testUser({ displayName: 'Renamed' })));
    expect(toast.dismiss).not.toHaveBeenCalled();

    act(() => useAuthStore.getState().setUser(null));
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('on sign-out, clears the old toasts before showing "Signed out"', async () => {
    act(() => useAuthStore.getState().setUser(testUser()));
    renderHook(() => useSessionScopedToasts());
    const actions = createSessionActions({
      auth: createFakeAuthRepository(),
      store: useAuthStore,
      clearCache: jest.fn(),
      confirm: jest.fn(async () => true),
    });

    await act(() => actions.signOut());

    const dismissedAt = jest.mocked(toast.dismiss).mock.invocationCallOrder[0] ?? Infinity;
    const shownAt = jest.mocked(toast.success).mock.invocationCallOrder[0] ?? -Infinity;
    expect(dismissedAt).toBeLessThan(shownAt);
    expect(toast.success).toHaveBeenCalledWith('Signed out', expect.anything());
  });
});

describe('AppToaster', () => {
  it('clears toasts when the app goes to the background', () => {
    let listener: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler;
      return { remove };
    });
    const { unmount } = render(<AppToaster />);

    listener?.('inactive');
    expect(toast.dismiss).not.toHaveBeenCalled();
    listener?.('background');
    expect(toast.dismiss).toHaveBeenCalledTimes(1);

    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
