import type { DetailTable } from '@/core/db/schema';
import { AppError } from '@/core/errors/AppError';

import type { DetailRow, DetailSyncDao, PendingTombstone } from './local/detailSyncDao';
import type { DetailApi } from './remote/detailApi';

/** Parents before children, so a child never reaches the server before the row it hangs off. */
export const PUSH_ORDER: readonly DetailTable[] = [
  'exercises',
  'routines',
  'routine_exercises',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'bodyweight_logs',
  'exercise_favourites',
];

/** Rows per request: about 500 sets is well under PostgREST's body limit and the statement timeout. */
export const PUSH_PAGE = 500;

/**
 * Ids per deletion request. They travel in the URL (`id=in.(...)`), and gateways cap URLs at 8–16 KB, so a
 * deleted workout with hundreds of sets goes in several requests (security review M2).
 */
export const DELETE_CHUNK = 100;

export interface PushResult {
  /** Rows the server now has. */
  sent: number;
  /** Rows the server refused (a value it won't store, or a parent it refused); they stay marked to send. */
  refused: number;
  /** Deletions the server now has. */
  deleted: number;
}

/** Copies the person's workout detail to `teras-detail` (decision 22). The phone stays the source of truth. */
export interface DetailSyncRepository {
  /** Sends everything waiting for this person. One run at a time per person; a second call joins it. */
  pushPending(userId: string): Promise<PushResult>;
}

/** For builds without teras-detail keys: nothing leaves the phone. */
export const disabledDetailSync: DetailSyncRepository = {
  pushPending: async () => ({ sent: 0, refused: 0, deleted: 0 }),
};

interface Deps {
  dao: DetailSyncDao;
  api: DetailApi;
}

const isRefusal = (error: unknown) => error instanceof AppError && error.code === 'Rejected';

export class RemoteDetailSyncRepository implements DetailSyncRepository {
  private readonly pushing = new Map<string, Promise<PushResult>>();

  constructor(private readonly deps: Deps) {}

  pushPending(userId: string): Promise<PushResult> {
    const inFlight = this.pushing.get(userId);
    if (inFlight) return inFlight;
    const push = this.push(userId).finally(() => this.pushing.delete(userId));
    this.pushing.set(userId, push);
    return push;
  }

  /**
   * Each page is marked sent as it lands, so a run stopped part-way (offline, the app closed) resumes with
   * what's left. Any failure other than a refusal stops the run; the rows stay marked for next time.
   */
  private async push(userId: string): Promise<PushResult> {
    const result: PushResult = { sent: 0, refused: 0, deleted: 0 };
    for (const table of PUSH_ORDER) {
      let afterId = '';
      for (;;) {
        const page = await this.deps.dao.pending(table, userId, afterId, PUSH_PAGE);
        const last = page.at(-1);
        if (!last) break;
        const { sent, refused } = await this.sendPage(table, page);
        result.sent += sent;
        result.refused += refused;
        afterId = String(last.id);
      }
    }
    result.deleted = await this.pushDeletions(userId);
    return result;
  }

  /** The whole page at once; if the server refuses it, row by row, so one bad row can't hold back the rest. */
  private async sendPage(table: DetailTable, page: readonly DetailRow[]) {
    const { dao, api } = this.deps;
    try {
      await api.upsert(table, page);
      await dao.markSent(table, page);
      return { sent: page.length, refused: 0 };
    } catch (error) {
      if (!isRefusal(error)) throw error;
    }
    let sent = 0;
    let refused = 0;
    for (const row of page) {
      try {
        await api.upsert(table, [row]);
        await dao.markSent(table, [row]);
        sent += 1;
      } catch (error) {
        if (!isRefusal(error)) throw error;
        refused += 1;
      }
    }
    return { sent, refused };
  }

  /** Deletions go as one update per table and deletion time: one deleted workout and its sets share both. */
  private async pushDeletions(userId: string): Promise<number> {
    const { dao, api } = this.deps;
    let deleted = 0;
    let after = { tableName: '', id: '' };
    for (;;) {
      const page = await dao.tombstones(userId, after, PUSH_PAGE);
      const last = page.at(-1);
      if (!last) break;
      const groups = new Map<string, PendingTombstone[]>();
      for (const row of page) {
        const key = `${row.tableName} ${row.deletedAt}`;
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      for (const rows of groups.values()) {
        const [first] = rows;
        // Only the tables the server has; a tombstone naming anything else is never sent (review L2).
        if (!first || !PUSH_ORDER.includes(first.tableName)) continue;
        for (let start = 0; start < rows.length; start += DELETE_CHUNK) {
          const chunk = rows.slice(start, start + DELETE_CHUNK);
          await api.markDeleted(
            first.tableName,
            userId,
            chunk.map((row) => row.id),
            first.deletedAt,
          );
          await dao.removeTombstones(chunk);
          deleted += chunk.length;
        }
      }
      after = { tableName: last.tableName, id: last.id };
    }
    return deleted;
  }
}
