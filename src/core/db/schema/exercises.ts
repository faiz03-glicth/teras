import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';

export const MUSCLES = [
  'chest',
  'lats',
  'upper_back',
  'lower_back',
  'shoulders',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** How a set of the exercise is measured: weight × reps, reps against bodyweight, or a held time. */
export const EXERCISE_TYPES = ['weighted', 'bodyweight', 'timed'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/**
 * The exercise library: built-in and custom exercises in one table, so search and filters treat them alike.
 * Built-in rows are seeded by the migration with a readable slug id (`bench-press-barbell`) and no owner.
 * Custom rows get a UUID and `is_custom`. Local only: never pushed to Supabase.
 */
export const exercises = sqliteTable(
  'exercises',
  {
    ...syncColumns(),
    name: text('name').notNull(),
    equipment: text('equipment', { enum: EQUIPMENT }).notNull(),
    primaryMuscle: text('primary_muscle', { enum: MUSCLES }).notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<Muscle[]>().notNull(),
    type: text('type', { enum: EXERCISE_TYPES }).notNull(),
    isCompound: integer('is_compound', { mode: 'boolean' }).notNull(),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('exercises_primary_muscle').on(table.primaryMuscle),
    index('exercises_equipment').on(table.equipment),
  ],
);

/**
 * One row per person and favourited exercise. Removing a favourite deletes the row. Unique per owner;
 * guest rows have no owner (SQLite lets NULLs repeat), so the DAO checks before adding one.
 */
export const exerciseFavourites = sqliteTable(
  'exercise_favourites',
  {
    ...syncColumns(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('exercise_favourites_owner_exercise').on(table.userId, table.exerciseId)],
);

export type ExerciseRow = typeof exercises.$inferSelect;
export type NewExerciseRow = typeof exercises.$inferInsert;
export type ExerciseFavouriteRow = typeof exerciseFavourites.$inferSelect;
export type NewExerciseFavouriteRow = typeof exerciseFavourites.$inferInsert;
