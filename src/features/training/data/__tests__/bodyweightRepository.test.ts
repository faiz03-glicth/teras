import { asc } from 'drizzle-orm';

import { bodyweightLogs } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { LocalBodyweightRepository, type BodyweightRepository } from '../BodyweightRepository';
import { createBodyweightDao } from '../local/bodyweightDao';

const USER = 'user-1';
const MONDAY = '2026-10-05' as ISODate;
const TUESDAY = '2026-10-06' as ISODate;

async function setup(): Promise<{ db: AppDatabase; repo: BodyweightRepository }> {
  const db = await createTestDatabase();
  let ids = 0;
  let ticks = 0;
  const repo = new LocalBodyweightRepository({
    dao: createBodyweightDao(db),
    uuid: () => `bw-${++ids}`,
    now: () => new Date(Date.UTC(2026, 9, 5, 7, 0, ticks++)).toISOString(),
  });
  return { db, repo };
}

/** Every weigh-in, oldest first, as stored. */
const stored = (db: AppDatabase) =>
  db
    .select({
      userId: bodyweightLogs.userId,
      date: bodyweightLogs.date,
      weightKg: bodyweightLogs.weightKg,
      dirty: bodyweightLogs.dirty,
      deletedAt: bodyweightLogs.deletedAt,
    })
    .from(bodyweightLogs)
    .orderBy(asc(bodyweightLogs.createdAt))
    .all();

describe('logging bodyweight', () => {
  it("keeps the day's weigh-in for its owner, on this phone only", async () => {
    const { db, repo } = await setup();

    await repo.log(USER, MONDAY, 72.5);

    expect(stored(db)).toEqual([
      { userId: USER, date: MONDAY, weightKg: 72.5, dirty: false, deletedAt: null },
    ]);
  });

  it('keeps one weigh-in a day: a second one that day replaces the first', async () => {
    const { db, repo } = await setup();

    await repo.log(USER, MONDAY, 72.5);
    await repo.log(USER, MONDAY, 72.1);
    await repo.log(USER, TUESDAY, 71.9);

    expect(stored(db).map(({ date, weightKg }) => [date, weightKg])).toEqual([
      [MONDAY, 72.1],
      [TUESDAY, 71.9],
    ]);
  });

  it("never touches someone else's weigh-in on the same day", async () => {
    const { db, repo } = await setup();

    await repo.log(null, MONDAY, 64);
    await repo.log(USER, MONDAY, 72.5);

    expect(stored(db).map(({ userId, weightKg }) => [userId, weightKg])).toEqual([
      [null, 64],
      [USER, 72.5],
    ]);
  });

  it("hands a guest's weigh-ins to the account signed in to, still on this phone only", async () => {
    const { db, repo } = await setup();
    await repo.log(null, MONDAY, 64);

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-05T08:00:00.000Z');

    expect(stored(db)).toEqual([{ userId: USER, date: MONDAY, weightKg: 64, dirty: false, deletedAt: null }]);
  });
});
