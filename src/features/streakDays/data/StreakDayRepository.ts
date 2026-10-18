import type { ISODate } from '@/shared/lib/date/isoDate';

import type { StreakDayDao, StreakSync } from './local/streakDayDao';
import {
  STREAK_PAGE_SIZE,
  type StreakApi,
  type StreakBookmark,
  type StreakDateRow,
} from './remote/streakApi';

/**
 * The days the person checked in a Workout on Streak: dates only, pulled from the server and kept on the
 * phone, so the Calendar can show a day that was trained but not logged here. SQLite holds the copy;
 * Supabase `streak_workout_dates` is the source. Streak learns of Teras's trained days from `workout_days`
 * on the server; the one thing sent from here is a day logged with no details (`teras_log_day`), which is a
 * Streak check-in itself and comes back with the other dates.
 */
export interface StreakDayRepository {
  /** Brings the user's copy up to date. Returns how many dates were added or removed. */
  pull(userId: string): Promise<number>;
  /** The checked-in dates in the range (inclusive), oldest first. A guest has none. */
  list(owner: string | null, from: ISODate, to: ISODate): Promise<ISODate[]>;
  /** The years with at least one checked-in date, newest first. A guest has none. */
  years(owner: string | null): Promise<number[]>;
  /**
   * Logs `date` with no details: checked in on Streak first (it needs the network; a failure throws and
   * keeps nothing), then listed here at once.
   */
  logDay(userId: string, date: ISODate): Promise<void>;
}

export interface LocalStreakDayDeps {
  dao: StreakDayDao;
  api: StreakApi;
  now: () => string;
}

/**
 * Removed check-ins are purged on the server 7 days after they are removed, so a bookmark older than that
 * could miss a removal. A day short of it, the pull starts again from the beginning instead.
 */
const FULL_PULL_AFTER_MS = 6 * 24 * 60 * 60 * 1000;
/** A safety stop: far more pages than any person's check-ins fill. */
const MAX_PAGES = 100;
/** Before any check-in: Postgres reads these as the earliest possible time and date. */
const BEGINNING: StreakBookmark = { changedAt: '-infinity', date: '-infinity' };

const bookmarkOf = (row: StreakDateRow): StreakBookmark => ({ changedAt: row.changedAt, date: row.date });

export class LocalStreakDayRepository implements StreakDayRepository {
  /** Pulls in flight, per user, so a reconnect and a foreground at once send one request. */
  private readonly pulling = new Map<string, Promise<number>>();

  constructor(private readonly deps: LocalStreakDayDeps) {}

  async list(owner: string | null, from: ISODate, to: ISODate): Promise<ISODate[]> {
    if (owner === null) return [];
    return (await this.deps.dao.list(owner, from, to)) as ISODate[];
  }

  async years(owner: string | null): Promise<number[]> {
    return owner === null ? [] : this.deps.dao.years(owner);
  }

  async logDay(userId: string, date: ISODate): Promise<void> {
    await this.deps.api.logDay(date);
    await this.deps.dao.add(userId, date);
  }

  pull(userId: string): Promise<number> {
    const inFlight = this.pulling.get(userId);
    if (inFlight) return inFlight;
    const pull = this.run(userId).finally(() => this.pulling.delete(userId));
    this.pulling.set(userId, pull);
    return pull;
  }

  private async run(userId: string): Promise<number> {
    const { dao, now } = this.deps;
    const started = now();
    const sync = await dao.getSync(userId);
    const fresh = sync !== null && Date.parse(started) - Date.parse(sync.pulledAt) < FULL_PULL_AFTER_MS;
    return fresh && sync ? this.pullSince(userId, sync, started) : this.pullEverything(userId, sync, started);
  }

  /** Page by page from the bookmark: each page and the bookmark after it are saved together. */
  private async pullSince(userId: string, sync: StreakSync, started: string): Promise<number> {
    const { dao, api } = this.deps;
    let bookmark: StreakBookmark = { changedAt: sync.changedAt, date: sync.date };
    let changed = 0;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await api.workoutDates(bookmark);
      const last = rows.at(-1);
      if (last) bookmark = bookmarkOf(last);
      changed += await dao.apply(userId, rows, { ...bookmark, pulledAt: started });
      if (rows.length < STREAK_PAGE_SIZE) break;
    }
    return changed;
  }

  /** Every page from the beginning, then the whole copy replaced at once. */
  private async pullEverything(userId: string, sync: StreakSync | null, started: string): Promise<number> {
    const { dao, api } = this.deps;
    const checkedIn = new Map<string, boolean>();
    let bookmark: StreakBookmark | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await api.workoutDates(bookmark);
      for (const row of rows) checkedIn.set(row.date, row.checkedIn);
      const last = rows.at(-1);
      if (last) bookmark = bookmarkOf(last);
      if (rows.length < STREAK_PAGE_SIZE) break;
    }
    const dates = [...checkedIn].filter(([, on]) => on).map(([date]) => date);
    // Nothing on the server yet: keep any old bookmark's place, else start from the very beginning.
    const place = bookmark ?? (sync ? { changedAt: sync.changedAt, date: sync.date } : BEGINNING);
    return dao.replace(userId, dates, { ...place, pulledAt: started });
  }
}
