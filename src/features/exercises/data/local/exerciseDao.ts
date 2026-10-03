import { and, asc, desc, eq, isNotNull, isNull, max, or } from 'drizzle-orm';

import {
  exerciseFavourites,
  exercises,
  workoutExercises,
  workouts,
  workoutSets,
  type ExerciseRow,
  type NewExerciseFavouriteRow,
  type NewExerciseRow,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A signed-in user's id, or null for a guest. Built-in exercises belong to nobody. */
export type ExerciseOwner = string | null;

/**
 * Data source: SQLite `exercises` and `exercise_favourites`, plus a read of the workout tables for what
 * was done recently. Built-in rows are seeded by the migration.
 */
export interface ExerciseDao {
  /** Built-in exercises plus the owner's own, by name. */
  list(owner: ExerciseOwner): Promise<ExerciseRow[]>;
  get(id: string): Promise<ExerciseRow | null>;
  /** Adds a custom exercise and returns it as stored. */
  insertExercise(row: NewExerciseRow): Promise<ExerciseRow>;
  /** The owner's favourites, the first added first. */
  favouriteIds(owner: ExerciseOwner): Promise<string[]>;
  insertFavourite(row: NewExerciseFavouriteRow): Promise<void>;
  deleteFavourite(owner: ExerciseOwner, exerciseId: string): Promise<void>;
  /** Exercises completed in the owner's finished workouts, the most recently done first. */
  recentIds(owner: ExerciseOwner, limit: number): Promise<string[]>;
}

export function createExerciseDao(db: AppDatabase): ExerciseDao {
  const favouriteOf = (owner: ExerciseOwner) =>
    owner === null ? isNull(exerciseFavourites.userId) : eq(exerciseFavourites.userId, owner);

  return {
    async list(owner) {
      // Built-in rows have no owner, so a guest sees the whole library too.
      const visible =
        owner === null ? isNull(exercises.userId) : or(isNull(exercises.userId), eq(exercises.userId, owner));
      return db
        .select()
        .from(exercises)
        .where(and(visible, isNull(exercises.deletedAt)))
        .orderBy(asc(exercises.name))
        .all();
    },

    async get(id) {
      return db.select().from(exercises).where(eq(exercises.id, id)).get() ?? null;
    },

    async insertExercise(row) {
      return db.insert(exercises).values(row).returning().get();
    },

    async favouriteIds(owner) {
      return db
        .select({ exerciseId: exerciseFavourites.exerciseId })
        .from(exerciseFavourites)
        .where(favouriteOf(owner))
        .orderBy(asc(exerciseFavourites.createdAt))
        .all()
        .map((row) => row.exerciseId);
    },

    async insertFavourite(row) {
      db.insert(exerciseFavourites).values(row).onConflictDoNothing().run();
    },

    async deleteFavourite(owner, exerciseId) {
      db.delete(exerciseFavourites)
        .where(and(favouriteOf(owner), eq(exerciseFavourites.exerciseId, exerciseId)))
        .run();
    },

    async recentIds(owner, limit) {
      const ownedBy = owner === null ? isNull(workouts.userId) : eq(workouts.userId, owner);
      const last = max(workouts.startedAt);
      return db
        .select({ exerciseId: workoutExercises.exerciseId, last })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(
          and(
            ownedBy,
            isNotNull(workouts.endedAt),
            isNull(workouts.deletedAt),
            eq(workoutSets.status, 'done'),
          ),
        )
        .groupBy(workoutExercises.exerciseId)
        .orderBy(desc(last))
        .limit(limit)
        .all()
        .map((row) => row.exerciseId);
    },
  };
}
