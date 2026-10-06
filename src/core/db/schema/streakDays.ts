import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The days the person checked in a Workout on Streak, pulled from Supabase `streak_workout_dates`. Dates
 * only: no notes, times or other activities ever leave Streak. A local copy, never sent back. One row per
 * user per date that is checked in now; a check-in removed on Streak removes its row. `date` is the
 * person's local calendar day (YYYY-MM-DD), as on `workout_days`.
 */
export const streakDays = sqliteTable(
  'streak_days',
  {
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

/**
 * How far each user's pull of Streak's dates got: the last row's `changed_at` (kept verbatim, to the
 * microsecond, because the server compares it exactly) and `date`, and when that pull ran.
 */
export const streakSync = sqliteTable('streak_sync', {
  userId: text('user_id').primaryKey(),
  changedAt: text('changed_at').notNull(),
  date: text('date').notNull(),
  pulledAt: text('pulled_at').notNull(),
});

export type StreakDayRow = typeof streakDays.$inferSelect;
export type StreakSyncRow = typeof streakSync.$inferSelect;
