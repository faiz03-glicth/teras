import type { ProfileRow } from '@/core/db/schema';

import type { Profile } from '../domain/Profile';
import type { RemoteProfileRow } from './local/profileDao';
import type { RemoteProfile } from './remote/profileApi';

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
    provider: row.provider,
    timeZone: row.timeZone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** The server doesn't know the device time zone until sync (Phase 5), so a missing one keeps the local value. */
export function remoteToRow(remote: RemoteProfile, fallbackTimeZone: string): RemoteProfileRow {
  return {
    id: remote.id,
    email: remote.email,
    displayName: remote.display_name,
    username: remote.username,
    avatarUrl: remote.avatar_url,
    provider: remote.provider,
    timeZone: remote.time_zone ?? fallbackTimeZone,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    deletedAt: remote.deleted_at,
  };
}
