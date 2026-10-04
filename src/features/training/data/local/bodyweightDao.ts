import { and, eq, isNull } from 'drizzle-orm';

import { bodyweightLogs, type BodyweightLogRow, type NewBodyweightLogRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** Data source: SQLite `bodyweight_logs`, one weigh-in per row. */
export interface BodyweightDao {
  /** The owner's weigh-in on that day, if there is one (a guest's when `owner` is null). */
  onDate(owner: string | null, date: ISODate): Promise<BodyweightLogRow | null>;
  insert(row: NewBodyweightLogRow): Promise<void>;
  setWeight(id: string, weightKg: number, now: string): Promise<void>;
}

export function createBodyweightDao(db: AppDatabase): BodyweightDao {
  return {
    async onDate(owner, date) {
      const ownedBy = owner === null ? isNull(bodyweightLogs.userId) : eq(bodyweightLogs.userId, owner);
      return (
        db
          .select()
          .from(bodyweightLogs)
          .where(and(ownedBy, eq(bodyweightLogs.date, date), isNull(bodyweightLogs.deletedAt)))
          .get() ?? null
      );
    },

    async insert(row) {
      db.insert(bodyweightLogs).values(row).run();
    },

    async setWeight(id, weightKg, now) {
      db.update(bodyweightLogs).set({ weightKg, updatedAt: now }).where(eq(bodyweightLogs.id, id)).run();
    },
  };
}
