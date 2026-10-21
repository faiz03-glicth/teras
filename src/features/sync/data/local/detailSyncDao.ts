import { sql, type SQL } from 'drizzle-orm';

import type { DetailTable } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A row as the server stores it: snake_case columns, `user_id` included, no `dirty`. */
export type DetailRow = Record<string, string | number | boolean | null | string[]>;

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
function applying(db: AppDatabase, write: (tx: AppDatabase) => void): void {
  db.transaction((tx) => {
    tx.run(sql`update sync_state set applying = 1 where id = 1`);
    write(tx as unknown as AppDatabase);
    tx.run(sql`update sync_state set applying = 0 where id = 1`);
  });
}

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
  };
}
