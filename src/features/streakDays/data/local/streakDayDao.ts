import { and, asc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';

import { streakDays, streakSync, type StreakSyncRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A date's state on Streak: checked in now, or removed. */
export interface StreakDayChange {
  date: string;
  checkedIn: boolean;
}

/** Where a pull got to, saved with the dates it brought, so the two never disagree. */
export type StreakSync = Omit<StreakSyncRow, 'userId'>;

/** Data source: SQLite `streak_days` and `streak_sync` only. */
export interface StreakDayDao {
  /** The user's checked-in dates in the range (inclusive), oldest first. */
  list(userId: string, from: string, to: string): Promise<string[]>;
  getSync(userId: string): Promise<StreakSync | null>;
  /** Applies a page of changes and moves the bookmark, in one go. Returns how many dates changed. */
  apply(userId: string, changes: readonly StreakDayChange[], sync: StreakSync): Promise<number>;
  /** Replaces all of the user's dates (a pull from the beginning) and the bookmark. Returns how many changed. */
  replace(userId: string, dates: readonly string[], sync: StreakSync): Promise<number>;
}

/** Rows per statement: far below SQLite's limit on bound values, whatever the build. */
const CHUNK = 400;

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

export function createStreakDayDao(db: AppDatabase): StreakDayDao {
  type Tx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

  const saveSync = (tx: Tx, userId: string, sync: StreakSync) =>
    tx
      .insert(streakSync)
      .values({ userId, ...sync })
      .onConflictDoUpdate({ target: streakSync.userId, set: sync })
      .run();

  const select = (tx: Tx, where: SQL | undefined) =>
    tx
      .select({ date: streakDays.date })
      .from(streakDays)
      .where(where)
      .all()
      .map((row) => row.date);

  /** The user's stored dates: all of them, or those among `dates`. */
  const existing = (tx: Tx, userId: string, dates?: readonly string[]) =>
    new Set(
      dates
        ? chunks(dates).flatMap((part) =>
            select(tx, and(eq(streakDays.userId, userId), inArray(streakDays.date, part))),
          )
        : select(tx, eq(streakDays.userId, userId)),
    );

  const insert = (tx: Tx, userId: string, dates: readonly string[]) => {
    for (const part of chunks(dates)) {
      tx.insert(streakDays)
        .values(part.map((date) => ({ userId, date })))
        .run();
    }
  };

  return {
    async list(userId, from, to) {
      return db
        .select({ date: streakDays.date })
        .from(streakDays)
        .where(and(eq(streakDays.userId, userId), gte(streakDays.date, from), lte(streakDays.date, to)))
        .orderBy(asc(streakDays.date))
        .all()
        .map((row) => row.date);
    },

    async getSync(userId) {
      const row = db.select().from(streakSync).where(eq(streakSync.userId, userId)).get();
      if (!row) return null;
      return { changedAt: row.changedAt, date: row.date, pulledAt: row.pulledAt };
    },

    async apply(userId, changes, sync) {
      // The last word for each date wins, should a page ever name one twice.
      const latest = new Map(changes.map((change) => [change.date, change.checkedIn]));
      return db.transaction((tx) => {
        const before = existing(tx, userId, [...latest.keys()]);
        const added = [...latest].filter(([date, on]) => on && !before.has(date)).map(([date]) => date);
        const gone = [...latest].filter(([date, on]) => !on && before.has(date)).map(([date]) => date);
        insert(tx, userId, added);
        for (const part of chunks(gone)) {
          tx.delete(streakDays)
            .where(and(eq(streakDays.userId, userId), inArray(streakDays.date, part)))
            .run();
        }
        saveSync(tx, userId, sync);
        return added.length + gone.length;
      });
    },

    async replace(userId, dates, sync) {
      const next = new Set(dates);
      return db.transaction((tx) => {
        const before = existing(tx, userId);
        const changed =
          [...next].filter((date) => !before.has(date)).length +
          [...before].filter((date) => !next.has(date)).length;
        tx.delete(streakDays).where(eq(streakDays.userId, userId)).run();
        insert(tx, userId, [...next]);
        saveSync(tx, userId, sync);
        return changed;
      });
    },
  };
}
