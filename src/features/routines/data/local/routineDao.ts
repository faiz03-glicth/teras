import { asc, eq, isNull, max } from 'drizzle-orm';

import {
  routineExercises,
  routines,
  type NewRoutineExerciseRow,
  type NewRoutineRow,
  type RoutineExerciseRow,
  type RoutineRow,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/**
 * Data source: SQLite `routines` and `routine_exercises`. A routine and its exercises are always written
 * together, in one transaction, so a routine is never left half-saved.
 */
export interface RoutineDao {
  get(id: string): Promise<RoutineRow | null>;
  /** A routine's exercises, in order. */
  items(routineId: string): Promise<RoutineExerciseRow[]>;
  /** Where a new routine goes: after every other one. */
  nextPosition(): Promise<number>;
  insert(routine: NewRoutineRow, items: readonly NewRoutineExerciseRow[]): Promise<void>;
  /** Renames a routine and replaces its exercises with `items`. */
  update(id: string, name: string, items: readonly NewRoutineExerciseRow[], now: string): Promise<void>;
  softDelete(id: string, now: string): Promise<void>;
}

export function createRoutineDao(db: AppDatabase): RoutineDao {
  return {
    async get(id) {
      return db.select().from(routines).where(eq(routines.id, id)).get() ?? null;
    },

    async items(routineId) {
      return db
        .select()
        .from(routineExercises)
        .where(eq(routineExercises.routineId, routineId))
        .orderBy(asc(routineExercises.position))
        .all();
    },

    async nextPosition() {
      const row = db
        .select({ last: max(routines.position) })
        .from(routines)
        .where(isNull(routines.deletedAt))
        .get();
      return (row?.last ?? -1) + 1;
    },

    async insert(routine, items) {
      db.transaction((tx) => {
        tx.insert(routines).values(routine).run();
        if (items.length > 0)
          tx.insert(routineExercises)
            .values([...items])
            .run();
      });
    },

    async update(id, name, items, now) {
      db.transaction((tx) => {
        tx.update(routines).set({ name, updatedAt: now }).where(eq(routines.id, id)).run();
        // Nothing refers to a routine's exercises, so they are replaced outright: the order is the list's.
        tx.delete(routineExercises).where(eq(routineExercises.routineId, id)).run();
        if (items.length > 0)
          tx.insert(routineExercises)
            .values([...items])
            .run();
      });
    },

    async softDelete(id, now) {
      db.update(routines).set({ deletedAt: now, updatedAt: now }).where(eq(routines.id, id)).run();
    },
  };
}
