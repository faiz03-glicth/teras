import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';

/**
 * One training day's summary: the ONLY workout data that leaves the phone. Workout detail stays in SQLite;
 * this row is pushed to Supabase `workout_days`, where Streak reads it to draw the training wave.
 * `date` is the person's local calendar day (YYYY-MM-DD), so a day never moves when the time zone changes.
 * `level` (0–4) is computed here and frozen: see the workout-days domain. `dirty` rows still have to be sent.
 */
export const workoutDays = sqliteTable(
  'workout_days',
  {
    ...syncColumns(),
    date: text('date').notNull(),
    volumeKg: real('volume_kg').notNull(),
    sets: integer('sets').notNull(),
    workouts: integer('workouts').notNull(),
    level: integer('level').notNull(),
  },
  (table) => [index('workout_days_owner_date').on(table.userId, table.date)],
);

export type WorkoutDayRow = typeof workoutDays.$inferSelect;
export type NewWorkoutDayRow = typeof workoutDays.$inferInsert;
