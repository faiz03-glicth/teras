import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * guest_id: the guest's local profile id, kept after a guest logs out so their data can be resumed.
 * guest_active: '1' while a guest session is in progress (distinguishes "logged-out guest" from "guest").
 * last_user_id: the most recent signed-in user, used to restore the session offline.
 * last_pulled_at: sync watermark (Phase 5).
 */
export const APP_META_KEYS = ['guest_id', 'guest_active', 'last_user_id', 'last_pulled_at'] as const;
export type AppMetaKey = (typeof APP_META_KEYS)[number];

/** Local-only key/value table for device bookkeeping. Never synced. */
export const appMeta = sqliteTable('app_meta', {
  key: text('key', { enum: APP_META_KEYS }).primaryKey(),
  value: text('value').notNull(),
});
