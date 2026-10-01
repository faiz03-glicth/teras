import { eq } from 'drizzle-orm';

import { appMeta, type AppMetaKey } from './schema';
import type { AppDatabase } from './types';

export interface AppMetaDao {
  get(key: AppMetaKey): Promise<string | null>;
  set(key: AppMetaKey, value: string): Promise<void>;
  remove(key: AppMetaKey): Promise<void>;
}

/** Data source for the local-only `app_meta` key/value table. */
export function createAppMetaDao(db: AppDatabase): AppMetaDao {
  return {
    async get(key) {
      const row = db.select({ value: appMeta.value }).from(appMeta).where(eq(appMeta.key, key)).get();
      return row?.value ?? null;
    },
    async set(key, value) {
      db.insert(appMeta)
        .values({ key, value })
        .onConflictDoUpdate({ target: appMeta.key, set: { value } })
        .run();
    },
    async remove(key) {
      db.delete(appMeta).where(eq(appMeta.key, key)).run();
    },
  };
}
