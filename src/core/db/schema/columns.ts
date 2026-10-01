import { integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Columns every synced table carries (spec §7.1).
 * - `id`: UUID generated on the device.
 * - `user_id`: null for rows created while in guest mode.
 * - timestamps: ISO-8601 UTC strings; `deleted_at` is a soft delete.
 * - `dirty`: local-only flag (0/1) marking rows the sync engine still has to push.
 */
export const syncColumns = () => ({
  id: text('id').primaryKey(),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
});
