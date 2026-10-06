import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import { streakKeys } from '../useStreakDays';
import { usePullStreakDays } from '../usePullStreakDays';

const initial = useAuthStore.getState();

function mount() {
  const app = createWrapper();
  const view = renderHook(() => usePullStreakDays(), { wrapper: app.Wrapper });
  return { ...view, app, pull: app.repositories.streakDays.pull };
}

beforeEach(() => {
  useAuthStore.setState(initial, true);
  useAuthStore.getState().setUser(testUser());
});

afterEach(() => {
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

describe('usePullStreakDays', () => {
  it('pulls once signed in, again on reconnect and on returning to the app', async () => {
    const { pull } = mount();
    expect(pull).toHaveBeenCalledTimes(1);
    expect(pull).toHaveBeenCalledWith('user-1');

    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(pull).toHaveBeenCalledTimes(2);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(pull).toHaveBeenCalledTimes(3);
  });

  it('waits while offline', async () => {
    onlineManager.setOnline(false);
    const { pull } = mount();
    await act(async () => focusManager.setFocused(true));
    expect(pull).not.toHaveBeenCalled();
  });

  it('never pulls for a guest', () => {
    useAuthStore.getState().setUser(testUser({ id: 'guest-1', provider: 'guest' }));
    const { pull } = mount();
    expect(pull).not.toHaveBeenCalled();
  });

  it('refreshes the screens showing Streak days when a pull changed some', async () => {
    const app = createWrapper();
    app.repositories.streakDays.pull.mockResolvedValue(2);
    const invalidate = jest.spyOn(app.queryClient, 'invalidateQueries');
    renderHook(() => usePullStreakDays(), { wrapper: app.Wrapper });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: streakKeys.days }));
  });

  it('leaves the screens alone when nothing changed', async () => {
    const app = createWrapper();
    const invalidate = jest.spyOn(app.queryClient, 'invalidateQueries');
    renderHook(() => usePullStreakDays(), { wrapper: app.Wrapper });
    await waitFor(() => expect(app.repositories.streakDays.pull).toHaveBeenCalled());
    await act(async () => undefined);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
