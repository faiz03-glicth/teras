import { focusManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createWrapper } from '@test/providers';
import { testUser } from '@test/fakes/fakeRepositories';

import { profileQueryKey, useProfile } from '../useProfile';

/** The app leaving and returning to the foreground (what focusManager reports from AppState). */
async function returnToApp() {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

/** Mounts the hook and lets both the local read and the first Supabase refresh finish. */
async function mountProfile() {
  const app = createWrapper();
  const { result } = renderHook(() => useProfile(testUser()), { wrapper: app.Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await waitFor(() =>
    expect(app.queryClient.getQueryState(['profile', 'user-1', 'remote'])?.status).toBe('success'),
  );
  return app;
}

describe('useProfile remote refresh', () => {
  afterEach(() => focusManager.setFocused(undefined));

  it('calls Supabase once, not again each time the app returns to the foreground', async () => {
    const { repositories } = await mountProfile();
    expect(repositories.profile.refreshFromRemote).toHaveBeenCalledTimes(1);

    await returnToApp();
    await returnToApp();
    expect(repositories.profile.refreshFromRemote).toHaveBeenCalledTimes(1);
  });

  it('refreshes again at once when invalidated (e.g. by a sign-in)', async () => {
    const { repositories, queryClient } = await mountProfile();

    await act(() => queryClient.invalidateQueries({ queryKey: profileQueryKey('user-1') }));
    expect(repositories.profile.refreshFromRemote).toHaveBeenCalledTimes(2);
  });
});
