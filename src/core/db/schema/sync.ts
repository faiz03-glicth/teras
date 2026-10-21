import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The tables copied to the `teras-detail` project (decision 22). Triggers from migration 0007 keep their
 * `dirty` flag and `updated_at` current on every write, so no DAO has to remember to.
 */
export const DETAIL_TABLES = [
  'exercises',
  'exercise_favourites',
  'routines',
  'routine_exercises',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'bodyweight_logs',
] as const;
export type DetailTable = (typeof DETAIL_TABLES)[number];

/**
 * A row deleted on this phone that the server still has to hear about. The phone keeps hard-deleting, so
 * no read changes; a trigger writes one of these per deleted owned row (cascaded children included), and
 * the push turns it into a soft delete on the server, then removes it.
 */
export const syncTombstones = sqliteTable(
  'sync_tombstones',
  {
    tableName: text('table_name', { enum: DETAIL_TABLES }).notNull(),
    id: text('id').notNull(),
    userId: text('user_id').notNull(),
    deletedAt: text('deleted_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.tableName, table.id] })],
);

/**
 * One row (`id` 1). `applying` is 1 while the sync engine writes the server's rows or marks pushed rows
 * clean: the triggers then leave `dirty`, `updated_at` and the tombstones alone.
 */
export const syncState = sqliteTable('sync_state', {
  id: integer('id').primaryKey(),
  applying: integer('applying', { mode: 'boolean' }).notNull().default(false),
});

export type SyncTombstoneRow = typeof syncTombstones.$inferSelect;
