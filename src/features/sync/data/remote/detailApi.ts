import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { DetailTable } from '@/core/db/schema';
import { AppError } from '@/core/errors/AppError';

import type { DetailRow, PulledRow } from '../local/detailSyncDao';

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
  /**
   * The person's rows of `table` stored after the bookmark (deletions included), oldest first, at most
   * `page`. Null starts from the beginning.
   */
  pull(table: DetailTable, since: string | null, sinceId: string | null, page: number): Promise<PulledRow[]>;
}

// Server rows are external data: checked here, and each value again before it is stored.
const pulledRowsSchema = z.array(
  z.object({ id: z.string().min(1), data: z.record(z.string(), z.unknown()), synced_at: z.string().min(1) }),
);

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

    async pull(table, since, sinceId, page) {
      const { data, error } = await supabase.rpc('pull_changes', {
        table_name: table,
        since,
        since_id: sinceId,
        page,
      });
      if (error) throw toAppError(error);
      const parsed = pulledRowsSchema.safeParse(data ?? []);
      if (!parsed.success) throw new AppError('Unknown', 'teras-detail pull had an unexpected shape');
      return parsed.data.map((row) => ({ id: row.id, data: row.data, syncedAt: row.synced_at }));
    },
  };
}
