import { and, asc, desc, eq, gt, gte, isNull, lte, sql } from 'drizzle-orm';

import { workoutDays, type NewWorkoutDayRow, type WorkoutDayRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A signed-in user's id, or null for data created in guest mode. */
export type WorkoutDayOwner = string | null;

/** Data source: SQLite `workout_days` only. */
export interface WorkoutDayDao {
  getByDate(owner: WorkoutDayOwner, date: string): Promise<WorkoutDayRow | null>;
  /** Inserts the day, or replaces its totals and level if the row already exists. */
  save(row: NewWorkoutDayRow): Promise<void>;
  /** Days in the range (inclusive), oldest first. */
  list(owner: WorkoutDayOwner, from: string, to: string): Promise<WorkoutDayRow[]>;
  /** The years with at least one recorded day, newest first (one grouped read, no rows loaded). */
  years(owner: WorkoutDayOwner): Promise<number[]>;
  /** Volumes of the days with volume in the range (inclusive): what a new day is judged against. */
  trainingVolumes(owner: WorkoutDayOwner, from: string, to: string): Promise<number[]>;
  /** A user's days that still have to be sent. */
  listDirty(userId: string): Promise<WorkoutDayRow[]>;
  /**
   * Clears `dirty` only if the row is still the version that was sent (`updatedAt` unchanged), so a day
   * changed while the push was in flight stays dirty and goes up next time.
   */
  markClean(id: string, updatedAt: string): Promise<void>;
  /**
   * Stores days the server holds for this user (a new phone filling in), as they are: never marked to be
   * sent back, and a day this phone still has to send keeps its own totals. Returns how many changed.
   */
  saveFromServer(
    userId: string,
    days: readonly { date: string; volumeKg: number; sets: number; workouts: number; level: number }[],
    stamp: { uuid: () => string; now: string },
  ): Promise<number>;
}

const ownedBy = (owner: WorkoutDayOwner) =>
  owner === null ? isNull(workoutDays.userId) : eq(workoutDays.userId, owner);

export function createWorkoutDayDao(db: AppDatabase): WorkoutDayDao {
  const inRange = (owner: WorkoutDayOwner, from: string, to: string) =>
    and(
      ownedBy(owner),
      gte(workoutDays.date, from),
      lte(workoutDays.date, to),
      isNull(workoutDays.deletedAt),
    );

  return {
    async getByDate(owner, date) {
      return (
        db
          .select()
          .from(workoutDays)
          .where(and(ownedBy(owner), eq(workoutDays.date, date)))
          .get() ?? null
      );
    },

    async save(row) {
      db.insert(workoutDays)
        .values(row)
        .onConflictDoUpdate({
          target: workoutDays.id,
          set: {
            volumeKg: row.volumeKg,
            sets: row.sets,
            workouts: row.workouts,
            level: row.level,
            updatedAt: row.updatedAt,
            deletedAt: null,
            dirty: true,
          },
        })
        .run();
    },

    async list(owner, from, to) {
      return db
        .select()
        .from(workoutDays)
        .where(inRange(owner, from, to))
        .orderBy(asc(workoutDays.date))
        .all();
    },

    async years(owner) {
      const year = sql<string>`substr(${workoutDays.date}, 1, 4)`;
      return (
        db
          .selectDistinct({ year })
          .from(workoutDays)
          // A day whose workouts were all deleted keeps its row, emptied: it gives its year nothing to show.
          .where(and(ownedBy(owner), isNull(workoutDays.deletedAt), gt(workoutDays.workouts, 0)))
          .orderBy(desc(year))
          .all()
          .map((row) => Number(row.year))
      );
    },

    async trainingVolumes(owner, from, to) {
      return db
        .select({ volumeKg: workoutDays.volumeKg })
        .from(workoutDays)
        .where(and(inRange(owner, from, to), gt(workoutDays.volumeKg, 0)))
        .all()
        .map((row) => row.volumeKg);
    },

    async listDirty(userId) {
      return db
        .select()
        .from(workoutDays)
        .where(and(eq(workoutDays.userId, userId), eq(workoutDays.dirty, true)))
        .all();
    },

    async saveFromServer(userId, days, stamp) {
      if (days.length === 0) return 0;
      const dates = days.map((day) => day.date).sort();
      const stored = new Map(
        db
          .select()
          .from(workoutDays)
          .where(
            and(
              eq(workoutDays.userId, userId),
              gte(workoutDays.date, dates[0] ?? ''),
              lte(workoutDays.date, dates[dates.length - 1] ?? ''),
            ),
          )
          .all()
          .map((row) => [row.date, row]),
      );
      let changed = 0;
      db.transaction((tx) => {
        for (const day of days) {
          const mine = stored.get(day.date);
          if (mine?.dirty) continue;
          const same =
            mine &&
            mine.deletedAt === null &&
            mine.volumeKg === day.volumeKg &&
            mine.sets === day.sets &&
            mine.workouts === day.workouts &&
            mine.level === day.level;
          if (same) continue;
          const totals = { volumeKg: day.volumeKg, sets: day.sets, workouts: day.workouts, level: day.level };
          if (mine) {
            tx.update(workoutDays)
              .set({ ...totals, updatedAt: stamp.now, deletedAt: null, dirty: false })
              .where(eq(workoutDays.id, mine.id))
              .run();
          } else {
            tx.insert(workoutDays)
              .values({
                id: stamp.uuid(),
                userId,
                date: day.date,
                ...totals,
                createdAt: stamp.now,
                updatedAt: stamp.now,
                dirty: false,
              })
              .run();
          }
          changed += 1;
        }
      });
      return changed;
    },

    async markClean(id, updatedAt) {
      db.update(workoutDays)
        .set({ dirty: false })
        .where(and(eq(workoutDays.id, id), eq(workoutDays.updatedAt, updatedAt)))
        .run();
    },
  };
}
