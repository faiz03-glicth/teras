import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '../../db/client';
import migrations from '../../db/migrations/migrations';
import { done, failed, pending, type BootTask } from '../bootState';

export function useMigrationsTask(): BootTask {
  const { success, error } = useMigrations(db, migrations);
  if (error) return failed('Teras could not update its local database', error.message);
  return success ? done : pending;
}
