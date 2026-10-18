import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';
import { mockFn } from '@test/fakes/mockFn';

import { createWorkoutDayDao } from '../local/workoutDayDao';
import type { WorkoutDayApi } from '../remote/workoutDayApi';
import { LocalFirstWorkoutDayRepository, PUSH_PAGE } from '../WorkoutDayRepository';

const START = '2026-06-01' as ISODate;
const day = (offset: number) => addDays(START, offset);
const totals = (volumeKg: number, sets = 12) => ({ volumeKg, sets, workouts: 1 });
const USER = 'user-1';

async function setup() {
  const db = await createTestDatabase();
  const api: jest.Mocked<WorkoutDayApi> = {
    upsert: mockFn<WorkoutDayApi['upsert']>(async () => undefined),
    list: mockFn<WorkoutDayApi['list']>(async () => []),
  };
  let ids = 0;
  let ticks = 0;
  const repo = new LocalFirstWorkoutDayRepository({
    dao: createWorkoutDayDao(db),
    api,
    uuid: () => `day-${++ids}`,
    now: () => new Date(Date.UTC(2026, 8, 30, 0, 0, ticks++)).toISOString(),
  });
  return { db, api, repo };
}

describe('recordDay', () => {
  it('stores a day with the level it is given', async () => {
    const { repo } = await setup();
    const saved = await repo.recordDay(USER, day(0), totals(5000), 3);
    expect(saved).toEqual({ date: day(0), volumeKg: 5000, sets: 12, workouts: 1, level: 3 });
    expect(await repo.list(USER, day(0), day(0))).toEqual([saved]);
  });

  it('replaces a day recorded again, and leaves every other day as it was', async () => {
    const { repo } = await setup();
    for (let i = 0; i < 6; i += 1) await repo.recordDay(USER, day(i), totals(5000), 2);
    const later = await repo.recordDay(USER, day(6), totals(5000), 2);

    await repo.recordDay(USER, day(2), totals(9000, 20), 4);

    const days = await repo.list(USER, day(0), day(6));
    expect(days).toHaveLength(7);
    expect(days[2]).toMatchObject({ date: day(2), volumeKg: 9000, sets: 20, level: 4 });
    // Frozen: a later day is not re-judged because an earlier one changed.
    expect(days[6]).toEqual(later);
  });

  it("keeps guest days apart from a signed-in person's", async () => {
    const { repo } = await setup();
    await repo.recordDay(null, day(0), totals(4000), 1);
    await repo.recordDay(USER, day(0), totals(6000), 1);
    expect(await repo.list(null, day(0), day(0))).toMatchObject([{ volumeKg: 4000 }]);
    expect(await repo.list(USER, day(0), day(0))).toMatchObject([{ volumeKg: 6000 }]);
  });
});

describe('windowBefore', () => {
  it('is the volumes of the training days in the 90 days before a day: what it was judged against', async () => {
    const { repo } = await setup();
    await repo.recordDay(USER, day(0), totals(4000), 2);
    await repo.recordDay(USER, day(5), totals(6000), 2);
    await repo.recordDay(USER, day(10), totals(9000), 2);

    expect((await repo.windowBefore(USER, day(10))).sort()).toEqual([4000, 6000]);
  });

  it('leaves out days without volume, the day itself, and days more than 90 days back', async () => {
    const { repo } = await setup();
    await repo.recordDay(USER, day(0), totals(4000), 2);
    await repo.recordDay(USER, day(50), { volumeKg: 0, sets: 3, workouts: 1 }, 1);
    await repo.recordDay(USER, day(95), totals(7000), 2);

    expect(await repo.windowBefore(USER, day(95))).toEqual([]);
    expect(await repo.windowBefore(USER, day(96))).toEqual([7000]);
  });

  it("keeps a guest's days apart from a signed-in person's", async () => {
    const { repo } = await setup();
    await repo.recordDay(null, day(0), totals(4000), 2);

    expect(await repo.windowBefore(USER, day(1))).toEqual([]);
    expect(await repo.windowBefore(null, day(1))).toEqual([4000]);
  });
});

describe('pushPending', () => {
  it('sends the days that are not on the server yet, once', async () => {
    const { repo, api } = await setup();
    await repo.recordDay(USER, day(0), totals(5000), 2);
    await repo.recordDay(USER, day(1), totals(6000, 15), 2);

    expect(await repo.pushPending(USER)).toBe(2);
    expect(api.upsert).toHaveBeenCalledWith(USER, [
      { date: day(0), volume_kg: 5000, sets: 12, workouts: 1, level: 2 },
      { date: day(1), volume_kg: 6000, sets: 15, workouts: 1, level: 2 },
    ]);

    expect(await repo.pushPending(USER)).toBe(0);
    expect(api.upsert).toHaveBeenCalledTimes(1);
  });

  it('sends a day again after it changes', async () => {
    const { repo, api } = await setup();
    await repo.recordDay(USER, day(0), totals(5000), 2);
    await repo.pushPending(USER);

    await repo.recordDay(USER, day(0), totals(7500), 2);
    expect(await repo.pushPending(USER)).toBe(1);
    expect(api.upsert).toHaveBeenLastCalledWith(USER, [expect.objectContaining({ volume_kg: 7500 })]);
  });

  it('keeps the days to retry when the push fails', async () => {
    const { repo, api } = await setup();
    await repo.recordDay(USER, day(0), totals(5000), 2);
    api.upsert.mockRejectedValueOnce(new Error('offline'));

    await expect(repo.pushPending(USER)).rejects.toThrow('offline');
    expect(await repo.pushPending(USER)).toBe(1);
  });

  it('sends a long backlog a page at a time, and keeps only the unsent pages when one fails', async () => {
    const { repo, api } = await setup();
    const backlog = PUSH_PAGE * 2 + 50;
    for (let offset = 0; offset < backlog; offset += 1)
      await repo.recordDay(USER, day(offset), totals(5000), 2);
    api.upsert.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('timeout'));

    await expect(repo.pushPending(USER)).rejects.toThrow('timeout');
    expect(api.upsert.mock.calls.map(([, days]) => days.length)).toEqual([PUSH_PAGE, PUSH_PAGE]);

    expect(await repo.pushPending(USER)).toBe(PUSH_PAGE + 50);
    expect(api.upsert.mock.calls.slice(2).map(([, days]) => days.length)).toEqual([PUSH_PAGE, 50]);
    expect(await repo.pushPending(USER)).toBe(0);
  });

  it('sends days logged as a guest once that person signs in', async () => {
    const { repo, db } = await setup();
    await repo.recordDay(null, day(0), totals(5000), 2);
    expect(await repo.pushPending(USER)).toBe(0);

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-09-30T01:00:00.000Z');

    expect(await repo.pushPending(USER)).toBe(1);
    expect(await repo.list(USER, day(0), day(0))).toHaveLength(1);
  });
});

describe('years', () => {
  it('lists each year with a recorded day once, newest first, for its owner only', async () => {
    const { repo } = await setup();
    await repo.recordDay(USER, '2021-03-04' as ISODate, totals(5000), 2);
    await repo.recordDay(USER, '2021-11-30' as ISODate, totals(5000), 2);
    await repo.recordDay(USER, '2026-10-01' as ISODate, totals(5000), 3);
    await repo.recordDay(USER, '2023-01-01' as ISODate, totals(5000), 1);
    await repo.recordDay(null, '2019-05-05' as ISODate, totals(5000), 1);

    expect(await repo.years(USER)).toEqual([2026, 2023, 2021]);
    expect(await repo.years(null)).toEqual([2019]);
  });

  it('leaves out a year whose only day was emptied (its workouts deleted)', async () => {
    const { repo } = await setup();
    await repo.recordDay(USER, '2024-02-02' as ISODate, { volumeKg: 0, sets: 0, workouts: 0 }, 0);
    await repo.recordDay(USER, '2026-10-01' as ISODate, totals(5000), 3);

    expect(await repo.years(USER)).toEqual([2026]);
  });
});
