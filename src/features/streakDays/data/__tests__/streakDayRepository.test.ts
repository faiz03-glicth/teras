import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';
import { mockFn } from '@test/fakes/mockFn';

import { createStreakDayDao } from '../local/streakDayDao';
import { STREAK_PAGE_SIZE, type StreakApi, type StreakDateRow } from '../remote/streakApi';
import { LocalStreakDayRepository } from '../StreakDayRepository';

const USER = 'user-1';
const OTHER = 'user-2';
const FROM = '2026-01-01' as ISODate;
const TO = '2026-12-31' as ISODate;

/** Server clock values keep their microseconds: the bookmark must go back exactly as it came. */
const at = (n: number) => `2026-10-06T09:00:00.${String(n).padStart(6, '0')}+00:00`;
const checked = (date: string, n: number): StreakDateRow => ({ date, checkedIn: true, changedAt: at(n) });
const removed = (date: string, n: number): StreakDateRow => ({ date, checkedIn: false, changedAt: at(n) });

async function setup() {
  const db = await createTestDatabase();
  const pages: StreakDateRow[][] = [];
  const api: jest.Mocked<StreakApi> = {
    workoutDates: mockFn<StreakApi['workoutDates']>(async () => pages.shift() ?? []),
    logDay: mockFn<StreakApi['logDay']>(async () => undefined),
  };
  let clock = Date.UTC(2026, 9, 6, 9, 30);
  const repo = new LocalStreakDayRepository({
    dao: createStreakDayDao(db),
    api,
    now: () => new Date(clock).toISOString(),
  });
  const later = (days: number) => {
    clock += days * 24 * 60 * 60 * 1000;
  };
  return { api, repo, pages, later };
}

describe('pull', () => {
  it('starts from the beginning and keeps the dates still checked in', async () => {
    const { api, repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1), checked('2026-10-03', 2), removed('2026-10-02', 3)]);

    expect(await repo.pull(USER)).toBe(2);
    expect(api.workoutDates).toHaveBeenCalledWith(null);
    expect(await repo.list(USER, FROM, TO)).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('carries on from where the last pull stopped, and drops a check-in removed on Streak', async () => {
    const { api, repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1), checked('2026-10-03', 2)]);
    await repo.pull(USER);

    pages.push([removed('2026-10-01', 7)]);
    expect(await repo.pull(USER)).toBe(1);
    expect(api.workoutDates).toHaveBeenLastCalledWith({ changedAt: at(2), date: '2026-10-03' });
    expect(await repo.list(USER, FROM, TO)).toEqual(['2026-10-03']);
  });

  it('asks for the next page from the last row of a full page, exactly as the server sent it', async () => {
    const { api, repo, pages } = await setup();
    const full = Array.from({ length: STREAK_PAGE_SIZE }, (_, i) =>
      checked(`2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, 1),
    );
    pages.push(full, [checked('2026-10-05', 2)]);

    await repo.pull(USER);
    expect(api.workoutDates).toHaveBeenCalledTimes(2);
    expect(api.workoutDates).toHaveBeenLastCalledWith({ changedAt: at(1), date: full.at(-1)?.date });
    expect(await repo.list(USER, '2026-10-05' as ISODate, '2026-10-05' as ISODate)).toEqual(['2026-10-05']);
  });

  it('reports nothing changed when Streak has nothing new', async () => {
    const { repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1)]);
    await repo.pull(USER);
    expect(await repo.pull(USER)).toBe(0);
    expect(await repo.list(USER, FROM, TO)).toEqual(['2026-10-01']);
  });

  it('starts again from the beginning after a week away, replacing the copy it had', async () => {
    const { api, repo, pages, later } = await setup();
    pages.push([checked('2026-10-01', 1), checked('2026-10-02', 2)]);
    await repo.pull(USER);

    // Removed check-ins are purged on the server after 7 days, so an old bookmark could miss a removal.
    later(7);
    pages.push([checked('2026-10-02', 2)]);
    await repo.pull(USER);
    expect(api.workoutDates).toHaveBeenLastCalledWith(null);
    expect(await repo.list(USER, FROM, TO)).toEqual(['2026-10-02']);
  });

  it('keeps the bookmark where it was when a request fails, so the next pull tries the same rows', async () => {
    const { api, repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1)]);
    await repo.pull(USER);

    api.workoutDates.mockRejectedValueOnce(new Error('offline'));
    await expect(repo.pull(USER)).rejects.toThrow('offline');
    await repo.pull(USER);
    expect(api.workoutDates).toHaveBeenLastCalledWith({ changedAt: at(1), date: '2026-10-01' });
  });

  it('sends one request when two pulls start at once', async () => {
    const { api, repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1)]);
    await Promise.all([repo.pull(USER), repo.pull(USER)]);
    expect(api.workoutDates).toHaveBeenCalledTimes(1);
  });
});

describe('list', () => {
  it("keeps each person's dates to themselves, and a guest has none", async () => {
    const { repo, pages } = await setup();
    pages.push([checked('2026-10-01', 1)]);
    await repo.pull(USER);
    pages.push([checked('2026-10-02', 1)]);
    await repo.pull(OTHER);

    expect(await repo.list(USER, FROM, TO)).toEqual(['2026-10-01']);
    expect(await repo.list(OTHER, FROM, TO)).toEqual(['2026-10-02']);
    expect(await repo.list(null, FROM, TO)).toEqual([]);
  });

  it('returns only the dates in the range, oldest first', async () => {
    const { repo, pages } = await setup();
    pages.push([checked('2026-10-09', 1), checked('2026-09-30', 2), checked('2026-10-01', 3)]);
    await repo.pull(USER);
    expect(await repo.list(USER, '2026-10-01' as ISODate, '2026-10-31' as ISODate)).toEqual([
      '2026-10-01',
      '2026-10-09',
    ]);
  });
});

describe('logDay', () => {
  const DAY = '2026-09-22' as ISODate;

  it('logs the day on Streak, then lists it at once, before any pull', async () => {
    const { api, repo } = await setup();

    await repo.logDay(USER, DAY);

    expect(api.logDay).toHaveBeenCalledWith(DAY);
    expect(await repo.list(USER, FROM, TO)).toEqual([DAY]);
    expect(api.workoutDates).not.toHaveBeenCalled();
  });

  it('lists a day logged twice once, and a pull that brings it back changes nothing', async () => {
    const { repo, pages } = await setup();
    await repo.logDay(USER, DAY);
    await repo.logDay(USER, DAY);

    pages.push([checked(DAY, 1)]);
    expect(await repo.pull(USER)).toBe(0);
    expect(await repo.list(USER, FROM, TO)).toEqual([DAY]);
  });

  it('leaves where the pulls got to alone, so the next one still starts from the beginning', async () => {
    const { api, repo } = await setup();
    await repo.logDay(USER, DAY);

    await repo.pull(USER);

    expect(api.workoutDates).toHaveBeenCalledWith(null);
  });

  it('keeps nothing when Streak could not log it', async () => {
    const { api, repo } = await setup();
    api.logDay.mockRejectedValueOnce(new Error('offline'));

    await expect(repo.logDay(USER, DAY)).rejects.toThrow('offline');
    expect(await repo.list(USER, FROM, TO)).toEqual([]);
  });
});

describe('years', () => {
  it("lists each year with a check-in once, newest first, and a guest's as none", async () => {
    const { repo, pages } = await setup();
    pages.push([checked('2024-06-01', 1), checked('2026-10-01', 2), checked('2024-07-01', 3)]);
    await repo.pull(USER);

    expect(await repo.years(USER)).toEqual([2026, 2024]);
    expect(await repo.years(OTHER)).toEqual([]);
    expect(await repo.years(null)).toEqual([]);
  });
});
