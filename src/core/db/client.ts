import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** The one on-device database. The change listener enables Drizzle live queries. */
export const sqlite = openDatabaseSync('teras.db', { enableChangeListener: true });

sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
