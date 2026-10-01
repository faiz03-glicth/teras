import { createTestDatabase } from '@test/db/createTestDatabase';

import { createAppMetaDao, type AppMetaDao } from '../appMetaDao';

describe('appMetaDao (in-memory SQLite)', () => {
  let dao: AppMetaDao;

  beforeEach(async () => {
    dao = createAppMetaDao(await createTestDatabase());
  });

  it('returns null for a key that was never set', async () => {
    await expect(dao.get('guest_id')).resolves.toBeNull();
  });

  it('sets, overwrites and removes values', async () => {
    await dao.set('guest_id', 'first');
    await dao.set('guest_id', 'second');
    await expect(dao.get('guest_id')).resolves.toBe('second');

    await dao.remove('guest_id');
    await expect(dao.get('guest_id')).resolves.toBeNull();
  });

  it('keeps keys independent', async () => {
    await dao.set('guest_id', 'g');
    await dao.set('last_user_id', 'u');
    await dao.remove('guest_id');
    await expect(dao.get('last_user_id')).resolves.toBe('u');
  });
});
