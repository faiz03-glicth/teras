import { and, eq, sql } from 'drizzle-orm';

import { profiles, type ProfileRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

export interface AuthIdentityRow {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: 'apple' | 'google' | 'email';
  timeZone: string;
}

export interface RemoteProfileRow extends Omit<ProfileRow, 'dirty' | 'userId'> {}

/** Data source: SQLite `profiles` only. */
export interface ProfileDao {
  getById(id: string): Promise<ProfileRow | null>;
  /** Insert or refresh from a sign-in; never clears a name/avatar the provider didn't send this time. */
  saveAuthIdentity(identity: AuthIdentityRow, now: string): Promise<void>;
  insertGuestIfMissing(guestId: string, timeZone: string, now: string): Promise<void>;
  /** Overwrites the local row with the server's copy (callers skip this while the row is dirty). */
  replaceFromRemote(row: RemoteProfileRow): Promise<void>;
  setDisplayName(id: string, displayName: string, now: string, dirty: boolean): Promise<void>;
  /**
   * Clears `dirty` only if the row is still the version that was pushed (`updatedAt` unchanged), so an
   * edit made while the push was in flight stays dirty and goes up next time.
   */
  markClean(id: string, updatedAt: string): Promise<void>;
}

export function createProfileDao(db: AppDatabase): ProfileDao {
  return {
    async getById(id) {
      return db.select().from(profiles).where(eq(profiles.id, id)).get() ?? null;
    },

    async saveAuthIdentity(identity, now) {
      db.insert(profiles)
        .values({ ...identity, userId: identity.id, createdAt: now, updatedAt: now, dirty: false })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            email: sql`coalesce(excluded.email, ${profiles.email})`,
            displayName: sql`coalesce(excluded.display_name, ${profiles.displayName})`,
            avatarUrl: sql`coalesce(excluded.avatar_url, ${profiles.avatarUrl})`,
            provider: identity.provider,
            deletedAt: null,
            updatedAt: now,
          },
        })
        .run();
    },

    async insertGuestIfMissing(guestId, timeZone, now) {
      db.insert(profiles)
        .values({ id: guestId, userId: null, provider: 'guest', timeZone, createdAt: now, updatedAt: now })
        .onConflictDoNothing({ target: profiles.id })
        .run();
    },

    async replaceFromRemote(row) {
      db.insert(profiles)
        .values({ ...row, userId: row.id, dirty: false })
        .onConflictDoUpdate({ target: profiles.id, set: { ...row, userId: row.id, dirty: false } })
        .run();
    },

    async setDisplayName(id, displayName, now, dirty) {
      db.update(profiles).set({ displayName, updatedAt: now, dirty }).where(eq(profiles.id, id)).run();
    },

    async markClean(id, updatedAt) {
      db.update(profiles)
        .set({ dirty: false })
        .where(and(eq(profiles.id, id), eq(profiles.updatedAt, updatedAt)))
        .run();
    },
  };
}
