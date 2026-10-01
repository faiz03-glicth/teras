import path from 'path';

import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import initSqlJs from 'sql.js';

import * as schema from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

const MIGRATIONS_FOLDER = path.join(__dirname, '../../src/core/db/migrations');

/** A fresh in-memory SQLite database with the app's real migrations applied. */
export async function createTestDatabase(): Promise<AppDatabase> {
  const SQL = await initSqlJs();
  const db = drizzle(new SQL.Database(), { schema });
  db.run('PRAGMA foreign_keys = ON;');
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
