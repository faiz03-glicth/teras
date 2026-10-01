import type { AuthUser } from '@/features/auth/domain/types';

import type { Profile } from '../domain/Profile';

/** Local-first profile access: SQLite is the source of truth, Supabase refreshes it when online. */
export interface ProfileRepository {
  getLocal(id: string): Promise<Profile | null>;
  /** Upserts the local row from a fresh sign-in without clobbering fields the auth provider doesn't know. */
  saveFromAuth(user: AuthUser): Promise<Profile>;
  /** Creates the local-only guest profile if it doesn't exist yet. */
  ensureGuest(guestId: string): Promise<Profile>;
  /**
   * Pushes unsaved local edits, then fetches the remote row, writes it to SQLite and returns it (the local
   * row instead while edits are still unsaved). Null if there is no remote row.
   */
  refreshFromRemote(id: string): Promise<Profile | null>;
  /** Saves locally and to Supabase (used for Apple's first-sign-in name). Offline, it's pushed later. */
  updateDisplayName(id: string, displayName: string): Promise<void>;
  /**
   * Sends edits saved while offline. Does nothing when there are none or the device is still offline;
   * rejects only for a real (non-network) failure.
   */
  pushPendingEdits(id: string): Promise<void>;
}
