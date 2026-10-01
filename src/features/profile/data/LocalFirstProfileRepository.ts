import { isNetworkError } from '@/core/errors/AppError';
import type { AuthUser } from '@/features/auth/domain/types';

import type { Profile } from '../domain/Profile';
import type { ProfileDao } from './local/profileDao';
import { remoteToRow, rowToProfile } from './mappers';
import type { ProfileRepository } from './ProfileRepository';
import type { ProfileApi } from './remote/profileApi';

export interface LocalFirstProfileDeps {
  dao: ProfileDao;
  api: ProfileApi;
  now: () => string;
  timeZone: () => string;
}

/**
 * SQLite is the source of truth; Supabase refreshes it when online. Local edits stay dirty until pushed,
 * and the device's edit wins: it is pushed before the server copy is read back.
 */
export class LocalFirstProfileRepository implements ProfileRepository {
  /** Pushes in flight, per profile, so a reconnect and a foreground at once send one request. */
  private readonly pushing = new Map<string, Promise<void>>();

  constructor(private readonly deps: LocalFirstProfileDeps) {}

  async getLocal(id: string): Promise<Profile | null> {
    const row = await this.deps.dao.getById(id);
    return row ? rowToProfile(row) : null;
  }

  async saveFromAuth(user: AuthUser): Promise<Profile> {
    if (user.provider === 'guest') return this.ensureGuest(user.id);
    await this.deps.dao.saveAuthIdentity(
      { ...user, provider: user.provider, timeZone: this.deps.timeZone() },
      this.deps.now(),
    );
    return this.require(user.id);
  }

  async ensureGuest(guestId: string): Promise<Profile> {
    await this.deps.dao.insertGuestIfMissing(guestId, this.deps.timeZone(), this.deps.now());
    return this.require(guestId);
  }

  async refreshFromRemote(id: string): Promise<Profile | null> {
    // Unsaved edits go up first, so the copy read back already includes them.
    await this.pushPendingEdits(id);
    const remote = await this.deps.api.fetch(id);
    if (!remote) return null;
    const local = await this.deps.dao.getById(id);
    // Still dirty (offline, or edited again meanwhile): the device's copy wins until it's pushed.
    if (local?.dirty) return rowToProfile(local);
    await this.deps.dao.replaceFromRemote(remoteToRow(remote, local?.timeZone ?? this.deps.timeZone()));
    return this.require(id);
  }

  async updateDisplayName(id: string, displayName: string): Promise<void> {
    await this.deps.dao.setDisplayName(id, displayName, this.deps.now(), true);
    await this.pushPendingEdits(id);
  }

  pushPendingEdits(id: string): Promise<void> {
    const inFlight = this.pushing.get(id);
    if (inFlight) return inFlight;
    const push = this.push(id).finally(() => this.pushing.delete(id));
    this.pushing.set(id, push);
    return push;
  }

  /**
   * Sends a dirty row's editable fields (today only the display name; add fields here as they become
   * editable) and marks it clean if it wasn't edited again meanwhile. Offline, the row just stays dirty.
   */
  private async push(id: string): Promise<void> {
    const row = await this.deps.dao.getById(id);
    // Guest profiles never reach Supabase.
    if (!row?.dirty || row.userId === null) return;
    try {
      await this.deps.api.updateDisplayName(id, row.displayName);
    } catch (error) {
      // Offline: the row stays dirty and is pushed on the next reconnect or return to the app.
      if (isNetworkError(error)) return;
      throw error;
    }
    await this.deps.dao.markClean(id, row.updatedAt);
  }

  private async require(id: string): Promise<Profile> {
    const profile = await this.getLocal(id);
    if (!profile) throw new Error('Profile row missing after write');
    return profile;
  }
}
