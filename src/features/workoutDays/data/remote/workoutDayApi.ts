import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';

/**
 * The Teras ↔ Streak contract: one row per person per training day in Supabase `public.workout_days`.
 * Teras is the only writer. Streak only reads (date + level draw the wave; volume and sets are for labels).
 * Server rows are external data: validated, never cast.
 */
const remoteWorkoutDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  volume_kg: z.number().nonnegative(),
  sets: z.number().int().nonnegative(),
  workouts: z.number().int().nonnegative(),
  level: z.number().int().min(0).max(4),
});

export type RemoteWorkoutDay = z.infer<typeof remoteWorkoutDaySchema>;

/** Data source: Supabase `public.workout_days` only (RLS limits every call to the signed-in user's rows). */
export interface WorkoutDayApi {
  /** Inserts the days, or replaces the ones already there for the same date. */
  upsert(userId: string, days: readonly RemoteWorkoutDay[]): Promise<void>;
  /** Days in the range (inclusive), oldest first: the same read Streak makes. */
  list(userId: string, from: string, to: string): Promise<RemoteWorkoutDay[]>;
}

function toAppError(error: { message: string }): AppError {
  const offline = /network request failed|failed to fetch|network error/i.test(error.message);
  return new AppError(
    offline ? 'Network' : 'Unknown',
    offline ? 'Network request failed' : 'Workout days request failed',
  );
}

const TABLE = 'workout_days';
const COLUMNS = 'date,volume_kg,sets,workouts,level';

export function createWorkoutDayApi(supabase: SupabaseClient): WorkoutDayApi {
  return {
    async upsert(userId, days) {
      if (days.length === 0) return;
      const { error } = await supabase.from(TABLE).upsert(
        days.map((day) => ({ ...day, user_id: userId })),
        { onConflict: 'user_id,date' },
      );
      if (error) throw toAppError(error);
    },

    async list(userId, from, to) {
      const { data, error } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
      if (error) throw toAppError(error);
      const parsed = z.array(remoteWorkoutDaySchema).safeParse(data ?? []);
      if (!parsed.success) throw new AppError('Unknown', 'Workout days response had an unexpected shape');
      return parsed.data;
    },
  };
}
