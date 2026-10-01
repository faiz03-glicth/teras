import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';

export const AUTH_PROVIDERS = ['apple', 'google', 'email', 'guest'] as const;

export const profiles = sqliteTable('profiles', {
  ...syncColumns(),
  email: text('email'),
  displayName: text('display_name'),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  provider: text('provider', { enum: AUTH_PROVIDERS }).notNull(),
  timeZone: text('time_zone').notNull(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
