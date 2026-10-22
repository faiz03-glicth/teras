import { sql, type SQL } from 'drizzle-orm';

import type { DetailTable } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A row as the server stores it: snake_case columns, `user_id` included, no `dirty`. */
export type DetailRow = Record<string, string | number | boolean | null | string[]>;

/** One row of `pull_changes`: the server's row as JSON (without `user_id`) and when it was stored. */
export interface PulledRow {
  id: string;
  data: Record<string, unknown>;
  /** Verbatim from the server (microseconds), for the next bookmark. */
  syncedAt: string;
}

/** Where a table's download got to: the last pulled row's `synced_at` and id. */
export interface PullBookmark {
  syncedAt: string;
  rowId: string;
}

export interface AppliedPull {
  /** Rows written or deleted on this phone. */
  changed: number;
  /** Rows left out: this phone's own unsent edit wins, a value it can't store, or a parent it doesn't have. */
  skipped: number;
  /** The earliest day of a workout this pull wrote, so the day summaries for it can be fetched. */
  earliestDate: string | null;
}

export interface PendingTombstone {
  tableName: DetailTable;
  id: string;
  deletedAt: string;
}

/** Data source: the detail tables' sync state in SQLite (migration 0007). */
export interface DetailSyncDao {
  /**
   * Up to `limit` rows of `table` waiting to be sent for `userId`, after `afterId` in id order. Only what
   * the server takes: custom exercises, and a workout with its exercises and sets once it has ended.
   */
  pending(table: DetailTable, userId: string, afterId: string, limit: number): Promise<DetailRow[]>;
  /** Marks the rows sent, each only if it hasn't changed since it was read (same `updated_at`). */
  markSent(table: DetailTable, rows: readonly DetailRow[]): Promise<void>;
  /** Up to `limit` deletions waiting to be sent for `userId`, in (table, id) order after the given key. */
  tombstones(
    userId: string,
    after: { tableName: string; id: string },
    limit: number,
  ): Promise<PendingTombstone[]>;
  /** Forgets deletions the server has, each only if it is still the same deletion. */
  removeTombstones(rows: readonly PendingTombstone[]): Promise<void>;
  /** How far this person's download of `table` got, or null before the first. */
  bookmark(userId: string, table: DetailTable): Promise<PullBookmark | null>;
  /**
   * Writes the server's rows into this phone's tables with the sync triggers quiet (nothing is marked to
   * send back), then moves the bookmark to `next`, in one transaction. A row this phone has edited and
   * not sent yet keeps its local version; a newer stored version is kept; a deletion deletes.
   */
  applyPulled(
    table: DetailTable,
    userId: string,
    rows: readonly PulledRow[],
    next: PullBookmark,
  ): Promise<AppliedPull>;
}

// The server's columns for each table (supabase/detail/0001_teras_detail.sql), in its order.
const SHARED = ['user_id', 'id'] as const;
const STAMPS = ['created_at', 'updated_at', 'deleted_at'] as const;
const COLUMNS: Record<DetailTable, readonly string[]> = {
  exercises: [
    ...SHARED,
    'name',
    'equipment',
    'primary_muscle',
    'secondary_muscles',
    'type',
    'is_compound',
    'is_custom',
    ...STAMPS,
  ],
  exercise_favourites: [...SHARED, 'exercise_id', ...STAMPS],
  routines: [...SHARED, 'name', 'position', 'is_starter', ...STAMPS],
  routine_exercises: [
    ...SHARED,
    'routine_id',
    'exercise_id',
    'position',
    'target_sets',
    'target_reps',
    'target_seconds',
    'start_weight_kg',
    ...STAMPS,
  ],
  workouts: [...SHARED, 'name', 'routine_id', 'date', 'started_at', 'ended_at', 'bodyweight_kg', ...STAMPS],
  workout_exercises: [...SHARED, 'workout_id', 'exercise_id', 'position', 'rest_seconds', ...STAMPS],
  workout_sets: [
    ...SHARED,
    'workout_exercise_id',
    'position',
    'weight_kg',
    'reps',
    'seconds',
    'status',
    'set_type',
    'rpe',
    'note',
    'completed_at',
    ...STAMPS,
  ],
  bodyweight_logs: [...SHARED, 'date', 'weight_kg', ...STAMPS],
};

const BOOLEANS = new Set(['is_compound', 'is_custom', 'is_starter']);

// What the server takes beyond "owned and dirty". `t` is the table itself.
const SCOPE: Record<DetailTable, SQL> = {
  exercises: sql`t.is_custom = 1`,
  exercise_favourites: sql`1 = 1`,
  routines: sql`1 = 1`,
  routine_exercises: sql`1 = 1`,
  workouts: sql`t.ended_at is not null`,
  workout_exercises: sql`exists (select 1 from workouts w where w.id = t.workout_id and w.ended_at is not null)`,
  workout_sets: sql`exists (select 1 from workout_exercises we join workouts w on w.id = we.workout_id
    where we.id = t.workout_exercise_id and w.ended_at is not null)`,
  bodyweight_logs: sql`1 = 1`,
};

/** SQLite's 0/1 and JSON text to what the server's boolean and jsonb columns take. */
function toServerRow(raw: Record<string, unknown>): DetailRow {
  const row: DetailRow = {};
  for (const [column, value] of Object.entries(raw)) {
    if (BOOLEANS.has(column)) row[column] = value === 1 || value === true;
    else if (column === 'secondary_muscles') row[column] = JSON.parse(String(value)) as string[];
    else row[column] = value as DetailRow[string];
  }
  return row;
}

/** Runs `write` with the sync triggers quiet, so marking a row sent doesn't mark it to be sent again. */
function applying<T>(db: AppDatabase, write: (tx: AppDatabase) => T): T {
  return db.transaction((tx) => {
    tx.run(sql`update sync_state set applying = 1 where id = 1`);
    const result = write(tx as unknown as AppDatabase);
    tx.run(sql`update sync_state set applying = 0 where id = 1`);
    return result;
  });
}

const TIMES = new Set(['created_at', 'updated_at', 'deleted_at', 'started_at', 'ended_at', 'completed_at']);
const NUMBERS = new Set([
  'position',
  'target_sets',
  'target_reps',
  'target_seconds',
  'start_weight_kg',
  'bodyweight_kg',
  'rest_seconds',
  'weight_kg',
  'reps',
  'seconds',
  'rpe',
]);

class InvalidPulledValue extends Error {}

/**
 * A server value as this phone stores it. Server rows are external data: anything of the wrong kind
 * throws, and the row is left out. Times become the phone's own ISO form (10:00:00.000Z), which the
 * triggers and the newest-edit comparison rely on.
 */
function toLocalValue(column: string, value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (TIMES.has(column)) {
    const time = typeof value === 'string' ? new Date(value) : null;
    if (!time || Number.isNaN(time.getTime())) throw new InvalidPulledValue(column);
    return time.toISOString();
  }
  if (BOOLEANS.has(column)) {
    if (typeof value !== 'boolean') throw new InvalidPulledValue(column);
    return value ? 1 : 0;
  }
  if (column === 'secondary_muscles') {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new InvalidPulledValue(column);
    }
    return JSON.stringify(value);
  }
  if (NUMBERS.has(column)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new InvalidPulledValue(column);
    return value;
  }
  if (typeof value !== 'string') throw new InvalidPulledValue(column);
  return value;
}

interface LocalState {
  id: string;
  userId: string | null;
  updatedAt: string;
  dirty: number;
}

/** SQLite's bound-parameter limit is far above this; it keeps each lookup small. */
const LOOKUP_CHUNK = 500;

export function createDetailSyncDao(db: AppDatabase): DetailSyncDao {
  return {
    async pending(table, userId, afterId, limit) {
      const columns = sql.join(
        COLUMNS[table].map((column) => sql`t.${sql.identifier(column)} as ${sql.identifier(column)}`),
        sql`, `,
      );
      const rows = db.all<Record<string, unknown>>(sql`
        select ${columns} from ${sql.identifier(table)} t
        where t.user_id = ${userId} and t.dirty = 1 and t.id > ${afterId} and ${SCOPE[table]}
        order by t.id limit ${limit}`);
      return rows.map(toServerRow);
    },

    async markSent(table, rows) {
      if (rows.length === 0) return;
      applying(db, (tx) => {
        for (const row of rows) {
          tx.run(sql`update ${sql.identifier(table)} set dirty = 0
            where id = ${row.id} and updated_at = ${row.updated_at}`);
        }
      });
    },

    async tombstones(userId, after, limit) {
      return db.all<PendingTombstone>(sql`
        select table_name as tableName, id, deleted_at as deletedAt from sync_tombstones
        where user_id = ${userId} and (table_name, id) > (${after.tableName}, ${after.id})
        order by table_name, id limit ${limit}`);
    },

    async removeTombstones(rows) {
      if (rows.length === 0) return;
      db.transaction((tx) => {
        for (const row of rows) {
          tx.run(sql`delete from sync_tombstones
            where table_name = ${row.tableName} and id = ${row.id} and deleted_at = ${row.deletedAt}`);
        }
      });
    },

    async bookmark(userId, table) {
      const [row] = db.all<PullBookmark>(sql`
        select synced_at as syncedAt, row_id as rowId from sync_bookmarks
        where user_id = ${userId} and table_name = ${table}`);
      return row ?? null;
    },

    async applyPulled(table, userId, rows, next) {
      const columns = COLUMNS[table].filter((column) => column !== 'user_id');
      return applying(db, (tx) => {
        const local = new Map<string, LocalState>();
        for (let start = 0; start < rows.length; start += LOOKUP_CHUNK) {
          const ids = rows.slice(start, start + LOOKUP_CHUNK).map((row) => sql`${row.id}`);
          for (const state of tx.all<LocalState>(sql`
            select id, user_id as userId, updated_at as updatedAt, dirty from ${sql.identifier(table)}
            where id in (${sql.join(ids, sql`, `)})`)) {
            local.set(state.id, state);
          }
        }

        const result: AppliedPull = { changed: 0, skipped: 0, earliestDate: null };
        for (const row of rows) {
          const mine = local.get(row.id);
          // Another person's row under the same id, or this phone's own edit still to be sent: keep it.
          if (mine && (mine.userId !== userId || mine.dirty === 1)) {
            result.skipped += 1;
            continue;
          }
          try {
            const values = columns.map((column) =>
              toLocalValue(column, column === 'id' ? row.id : row.data[column]),
            );
            const value = (column: string) => values[columns.indexOf(column)];
            if (value('deleted_at') !== null) {
              if (mine) {
                tx.run(
                  sql`delete from ${sql.identifier(table)} where id = ${row.id} and user_id = ${userId}`,
                );
                result.changed += 1;
              }
              continue;
            }
            const updatedAt = value('updated_at');
            if (mine && typeof updatedAt === 'string' && mine.updatedAt >= updatedAt) continue;
            if (table === 'exercise_favourites') {
              // One favourite per person and exercise: another phone's row for the same exercise replaces ours.
              tx.run(sql`delete from exercise_favourites where user_id = ${userId}
                and exercise_id = ${value('exercise_id')} and id <> ${row.id} and dirty = 0`);
            }
            const names = sql.join(
              columns.map((column) => sql.identifier(column)),
              sql`, `,
            );
            const params = sql.join(
              values.map((v) => sql`${v}`),
              sql`, `,
            );
            const updates = sql.join(
              columns
                .filter((column) => column !== 'id')
                .map((column) => sql`${sql.identifier(column)} = excluded.${sql.identifier(column)}`),
              sql`, `,
            );
            tx.run(sql`insert into ${sql.identifier(table)} (user_id, dirty, ${names})
              values (${userId}, 0, ${params})
              on conflict (id) do update set ${updates}, dirty = 0`);
            result.changed += 1;
            const date = value('date');
            if (
              table === 'workouts' &&
              typeof date === 'string' &&
              (!result.earliestDate || date < result.earliestDate)
            ) {
              result.earliestDate = date;
            }
          } catch {
            // A value of the wrong kind, or a parent this phone doesn't have (a foreign key): left out.
            result.skipped += 1;
          }
        }

        tx.run(sql`insert into sync_bookmarks (user_id, table_name, synced_at, row_id)
          values (${userId}, ${table}, ${next.syncedAt}, ${next.rowId})
          on conflict (user_id, table_name) do update set synced_at = excluded.synced_at, row_id = excluded.row_id`);
        return result;
      });
    },
  };
}
