import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';
import { exercises } from './exercises';
import { routines } from './routines';

/**
 * One workout session. Local only: `workout_days` is the summary that leaves the phone.
 * `date` is the local calendar day the session STARTED on (YYYY-MM-DD); it decides which heatmap day it
 * counts towards. `ended_at` is null while the workout is running. `bodyweight_kg` is a snapshot taken at
 * the start, so logging a new bodyweight never changes the volume of past days.
 */
export const workouts = sqliteTable(
  'workouts',
  {
    ...syncColumns(),
    name: text('name').notNull(),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    date: text('date').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    bodyweightKg: real('bodyweight_kg').notNull(),
  },
  (table) => [index('workouts_date').on(table.date)],
);

/** One exercise inside a session, in the order it was done. */
export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    ...syncColumns(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    restSeconds: integer('rest_seconds').notNull(),
  },
  (table) => [
    index('workout_exercises_workout').on(table.workoutId, table.position),
    index('workout_exercises_exercise').on(table.exerciseId),
  ],
);

export const SET_STATUSES = ['pending', 'done', 'skipped'] as const;
export type SetStatus = (typeof SET_STATUSES)[number];

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

/**
 * One set. Only `done` sets count towards volume, records and the heat level.
 * `weight_kg` is always kilograms: the lifted weight for weighted exercises, the ADDED weight for
 * bodyweight ones. `seconds` is for timed exercises. `rpe` (1–10, halves allowed) and `note` are optional.
 */
export const workoutSets = sqliteTable(
  'workout_sets',
  {
    ...syncColumns(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    seconds: integer('seconds'),
    status: text('status', { enum: SET_STATUSES }).notNull().default('pending'),
    setType: text('set_type', { enum: SET_TYPES }).notNull().default('normal'),
    rpe: real('rpe'),
    note: text('note'),
    completedAt: text('completed_at'),
  },
  (table) => [index('workout_sets_workout_exercise').on(table.workoutExerciseId, table.position)],
);

/** One weigh-in. The latest one is the current bodyweight. */
export const bodyweightLogs = sqliteTable(
  'bodyweight_logs',
  {
    ...syncColumns(),
    date: text('date').notNull(),
    weightKg: real('weight_kg').notNull(),
  },
  (table) => [index('bodyweight_logs_date').on(table.date)],
);

export type WorkoutRow = typeof workouts.$inferSelect;
export type NewWorkoutRow = typeof workouts.$inferInsert;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type NewWorkoutExerciseRow = typeof workoutExercises.$inferInsert;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;
export type NewWorkoutSetRow = typeof workoutSets.$inferInsert;
export type BodyweightLogRow = typeof bodyweightLogs.$inferSelect;
export type NewBodyweightLogRow = typeof bodyweightLogs.$inferInsert;
