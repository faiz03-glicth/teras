import { createAppMetaDao } from '@/core/db/appMetaDao';
import type { AppDatabase } from '@/core/db/types';
import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import { AppError } from '@/core/errors/AppError';
import { testUser } from '@test/fakes/fakeRepositories';
import { mockFn } from '@test/fakes/mockFn';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createProfileDao } from '../local/profileDao';
import { LocalFirstProfileRepository } from '../LocalFirstProfileRepository';
import type { ProfileApi, RemoteProfile } from '../remote/profileApi';

const remote = (overrides: Partial<RemoteProfile> = {}): RemoteProfile => ({
  id: 'user-1',
  email: 'person@example.com',
  display_name: 'Server Name',
  username: 'faiz',
  avatar_url: null,
  provider: 'google',
  time_zone: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('profile persistence (in-memory SQLite)', () => {
  let db: AppDatabase;
  let api: jest.Mocked<ProfileApi>;
  let repo: LocalFirstProfileRepository;

  beforeEach(async () => {
    db = await createTestDatabase();
    api = {
      fetch: mockFn<ProfileApi['fetch']>(async () => remote()),
      updateDisplayName: mockFn<ProfileApi['updateDisplayName']>(async () => undefined),
    };
    repo = new LocalFirstProfileRepository({
      dao: createProfileDao(db),
      api,
      now: () => '2026-09-24T10:00:00.000Z',
      timeZone: () => 'Asia/Kuala_Lumpur',
    });
  });

  it('saveFromAuth inserts, then keeps a name the provider stopped sending', async () => {
    await repo.saveFromAuth(testUser({ displayName: 'Faiz Ahmad' }));
    const again = await repo.saveFromAuth(testUser({ displayName: null, email: 'new@example.com' }));
    expect(again).toMatchObject({
      id: 'user-1',
      userId: 'user-1',
      displayName: 'Faiz Ahmad',
      email: 'new@example.com',
      timeZone: 'Asia/Kuala_Lumpur',
    });
  });

  it('ensureGuest creates a local-only profile once', async () => {
    const first = await repo.ensureGuest('guest-1');
    const second = await repo.ensureGuest('guest-1');
    expect(first).toEqual(second);
    expect(first).toMatchObject({ userId: null, provider: 'guest' });
  });

  it('refreshFromRemote writes the server copy but keeps the device time zone', async () => {
    await repo.saveFromAuth(testUser());
    const refreshed = await repo.refreshFromRemote('user-1');
    expect(refreshed).toMatchObject({
      displayName: 'Server Name',
      username: 'faiz',
      timeZone: 'Asia/Kuala_Lumpur',
    });
  });

  it('local edits stay dirty offline and win over the server until pushed', async () => {
    await repo.saveFromAuth(testUser());
    // Offline for the edit and for the push the refresh tries first.
    api.updateDisplayName.mockRejectedValue(new AppError('Network', 'offline'));
    await repo.updateDisplayName('user-1', 'Offline Edit');
    expect(await createProfileDao(db).getById('user-1')).toMatchObject({
      displayName: 'Offline Edit',
      dirty: true,
    });
    await expect(repo.refreshFromRemote('user-1')).resolves.toMatchObject({ displayName: 'Offline Edit' });
  });

  it('updateDisplayName marks the row clean once the server accepts it', async () => {
    await repo.saveFromAuth(testUser());
    await repo.updateDisplayName('user-1', 'New Name');
    expect(api.updateDisplayName).toHaveBeenCalledWith('user-1', 'New Name');
    expect(await createProfileDao(db).getById('user-1')).toMatchObject({
      displayName: 'New Name',
      dirty: false,
    });
  });

  describe('pushing edits saved offline', () => {
    const offline = () => new AppError('Network', 'offline');
    const dao = () => createProfileDao(db);

    async function editOffline(name = 'Offline Edit') {
      await repo.saveFromAuth(testUser());
      api.updateDisplayName.mockRejectedValueOnce(offline());
      await repo.updateDisplayName('user-1', name);
      api.updateDisplayName.mockClear();
    }

    it('sends the edit once back online and marks the row clean', async () => {
      await editOffline();
      await repo.pushPendingEdits('user-1');
      expect(api.updateDisplayName).toHaveBeenCalledWith('user-1', 'Offline Edit');
      expect(await dao().getById('user-1')).toMatchObject({ displayName: 'Offline Edit', dirty: false });
    });

    it('still offline: keeps the row dirty without failing', async () => {
      await editOffline();
      api.updateDisplayName.mockRejectedValueOnce(offline());
      await expect(repo.pushPendingEdits('user-1')).resolves.toBeUndefined();
      expect(await dao().getById('user-1')).toMatchObject({ dirty: true });
    });

    it('a refresh pushes first, so the server copy it reads back takes over', async () => {
      await editOffline();
      api.fetch.mockResolvedValueOnce(remote({ display_name: 'Offline Edit' }));
      await expect(repo.refreshFromRemote('user-1')).resolves.toMatchObject({ displayName: 'Offline Edit' });
      expect(api.updateDisplayName).toHaveBeenCalledWith('user-1', 'Offline Edit');
      expect(await dao().getById('user-1')).toMatchObject({ username: 'faiz', dirty: false });
    });

    it('an edit made while the push is in flight stays dirty for the next push', async () => {
      await editOffline('First');
      api.updateDisplayName.mockImplementationOnce(async () => {
        await dao().setDisplayName('user-1', 'Second', '2026-09-24T11:00:00.000Z', true);
      });
      await repo.pushPendingEdits('user-1');
      expect(await dao().getById('user-1')).toMatchObject({ displayName: 'Second', dirty: true });

      await repo.pushPendingEdits('user-1');
      expect(api.updateDisplayName).toHaveBeenLastCalledWith('user-1', 'Second');
      expect(await dao().getById('user-1')).toMatchObject({ dirty: false });
    });

    it('a reconnect and a return to the app at once send one request', async () => {
      await editOffline();
      await Promise.all([repo.pushPendingEdits('user-1'), repo.pushPendingEdits('user-1')]);
      expect(api.updateDisplayName).toHaveBeenCalledTimes(1);
    });

    it('does nothing without pending edits, and never pushes a guest profile', async () => {
      await repo.saveFromAuth(testUser());
      await repo.pushPendingEdits('user-1');
      await repo.ensureGuest('guest-1');
      await dao().setDisplayName('guest-1', 'Guest Name', '2026-09-24T11:00:00.000Z', true);
      await repo.pushPendingEdits('guest-1');
      expect(api.updateDisplayName).not.toHaveBeenCalled();
    });

    it('a real server failure rejects and keeps the edit for later', async () => {
      await editOffline();
      api.updateDisplayName.mockRejectedValueOnce(new AppError('Unknown', 'Profile request failed'));
      await expect(repo.pushPendingEdits('user-1')).rejects.toThrow('Profile request failed');
      expect(await dao().getById('user-1')).toMatchObject({ dirty: true });
    });
  });

  it('reassignGuestData retires the guest profile and clears guest markers in one transaction', async () => {
    const appMeta = createAppMetaDao(db);
    await repo.ensureGuest('guest-1');
    await repo.saveFromAuth(testUser({ id: 'someone-else' }));
    await appMeta.set('guest_id', 'guest-1');
    await appMeta.set('guest_active', '1');

    await createGuestDataDao(db).reassignGuestData('guest-1', 'user-1', '2026-09-24T10:00:00.000Z');

    const dao = createProfileDao(db);
    expect(await dao.getById('guest-1')).toMatchObject({
      userId: 'user-1',
      deletedAt: '2026-09-24T10:00:00.000Z',
    });
    expect(await dao.getById('someone-else')).toMatchObject({ userId: 'someone-else', deletedAt: null });
    expect(await appMeta.get('guest_id')).toBeNull();
    expect(await appMeta.get('guest_active')).toBeNull();
  });
});
