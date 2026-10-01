import { and, asc, eq, gt, gte, isNull, lte } from 'drizzle-orm';

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
  /** Volumes of the days with volume in the range (inclusive): what a new day is judged against. */
  trainingVolumes(owner: WorkoutDayOwner, from: string, to: string): Promise<number[]>;
  /** A user's days that still have to be sent. */
  listDirty(userId: string): Promise<WorkoutDayRow[]>;
  /**
   * Clears `dirty` only if the row is still the version that was sent (`updatedAt` unchanged), so a day
   * changed while the push was in flight stays dirty and goes up next time.
   */
  markClean(id: string, updatedAt: string): Promise<void>;
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

    async markClean(id, updatedAt) {
      db.update(workoutDays)
        .set({ dirty: false })
        .where(and(eq(workoutDays.id, id), eq(workoutDays.updatedAt, updatedAt)))
        .run();
    },
  };
}
