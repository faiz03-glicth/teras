import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import { usePushPendingProfileEdits } from '../usePushPendingProfileEdits';

const initial = useAuthStore.getState();

function mount() {
  const app = createWrapper();
  const view = renderHook(() => usePushPendingProfileEdits(), { wrapper: app.Wrapper });
  return { ...view, push: app.repositories.profile.pushPendingEdits };
}

beforeEach(() => {
  useAuthStore.setState(initial, true);
  useAuthStore.getState().setUser(testUser());
});

afterEach(() => {
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

describe('usePushPendingProfileEdits', () => {
  it('pushes once signed in, again on reconnect and on returning to the app', async () => {
    const { push } = mount();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('user-1');

    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(push).toHaveBeenCalledTimes(2);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(push).toHaveBeenCalledTimes(3);
  });

  it('waits while offline', async () => {
    onlineManager.setOnline(false);
    const { push } = mount();
    await act(async () => focusManager.setFocused(true));
    expect(push).not.toHaveBeenCalled();
  });

  it('never pushes for a guest', () => {
    useAuthStore.getState().setUser(testUser({ id: 'guest-1', provider: 'guest' }));
    const { push } = mount();
    expect(push).not.toHaveBeenCalled();
  });

  it('stops listening after sign-out', async () => {
    const { push } = mount();
    await act(async () => useAuthStore.getState().setUser(null));
    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
});
