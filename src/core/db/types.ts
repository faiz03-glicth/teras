import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * The database shape DAOs depend on. Both the app driver (expo-sqlite) and the test driver (sql.js)
 * are synchronous SQLite databases, so DAOs are written once and tested against an in-memory database.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
