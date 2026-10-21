import type { SupabaseClient } from '@supabase/supabase-js';

import type { DetailTable } from '@/core/db/schema';
import { AppError } from '@/core/errors/AppError';

import type { DetailRow } from '../local/detailSyncDao';

/**
 * Why a request failed. `Rejected`: the server refused these rows' values (a check, a missing parent): the
 * rest of the batch may still go. `Quota`: the account is at its size limit. `Network`: offline. `Unknown`:
 * anything else, such as a sign-in the server no longer accepts.
 */
export type DetailSyncErrorCode = 'Rejected' | 'Quota' | 'Network' | 'Unknown';

/** Data source: the `teras-detail` project. Row Level Security limits every call to the signed-in person. */
export interface DetailApi {
  /** Inserts the rows, or replaces the stored versions the server judges older (the newest edit wins). */
  upsert(table: DetailTable, rows: readonly DetailRow[]): Promise<void>;
  /** Soft-deletes the person's rows with these ids, at `deletedAt`. Ids the server never had are ignored. */
  markDeleted(table: DetailTable, userId: string, ids: readonly string[], deletedAt: string): Promise<void>;
}

function toAppError(error: { message: string; code?: string }): AppError<DetailSyncErrorCode> {
  if (/network request failed|failed to fetch|network error/i.test(error.message)) {
    return new AppError('Network', 'Network request failed');
  }
  // SQLSTATE classes 22 (data exception) and 23 (integrity constraint violation).
  if (error.code && /^2[23]/.test(error.code)) return new AppError('Rejected', 'The server refused a row');
  if (error.code === '54000') return new AppError('Quota', 'The account is at its size limit');
  return new AppError('Unknown', 'teras-detail request failed');
}

export function createDetailApi(supabase: SupabaseClient): DetailApi {
  return {
    async upsert(table, rows) {
      if (rows.length === 0) return;
      const { error } = await supabase.from(table).upsert(rows as DetailRow[], { onConflict: 'user_id,id' });
      if (error) throw toAppError(error);
    },

    async markDeleted(table, userId, ids, deletedAt) {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: deletedAt, updated_at: deletedAt })
        .eq('user_id', userId)
        .in('id', ids as string[]);
      if (error) throw toAppError(error);
    },
  };
}
