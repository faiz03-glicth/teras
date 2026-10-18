import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { LOCAL_READ } from '@/core/query/queryClient';
import { streakKeys, useStreakDays } from '@/features/streakDays/hooks/useStreakDays';
import type { WorkoutOwner } from '@/features/workouts/data/WorkoutRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import type { ISODate } from '@/shared/lib/date/isoDate';

import {
  buildYearDays,
  calendarYears,
  monthGrid,
  yearStrip,
  type DayLook,
  type GridPaths,
  type YearDays,
} from '../domain/yearCalendar';
import { useTrainingDays } from './useTrainingDays';

export type LoadStatus = 'loading' | 'error' | 'ready';

const statusOf = (queries: readonly { isError: boolean; isPending: boolean }[]): LoadStatus =>
  queries.some((query) => query.isError)
    ? 'error'
    : queries.some((query) => query.isPending)
      ? 'loading'
      : 'ready';

/**
 * The years that have a trained day or a Streak check-in, newest first: two grouped reads, no days loaded.
 * Both keys sit under the day prefixes, so a logged or deleted day refreshes the list with everything else.
 */
export function useCalendarYears(owner: WorkoutOwner) {
  const { workoutDays, streakDays } = useRepositories();
  const trained = useQuery({
    ...LOCAL_READ,
    queryKey: [...workoutKeys.days, owner, 'years'],
    queryFn: () => workoutDays.years(owner),
  });
  const checkedIn = useQuery({
    ...LOCAL_READ,
    queryKey: [...streakKeys.days, owner, 'years'],
    queryFn: () => streakDays.years(owner),
  });
  const years = useMemo(
    () => calendarYears(trained.data ?? [], checkedIn.data ?? []),
    [checkedIn.data, trained.data],
  );
  const { refetch: refetchTrained } = trained;
  const { refetch: refetchCheckedIn } = checkedIn;
  return {
    years,
    status: statusOf([trained, checkedIn]),
    retry: () => {
      void refetchTrained();
      void refetchCheckedIn();
    },
  };
}

/**
 * Each year's built days, kept while its two queries hold the same data (TanStack keeps a cached result's
 * identity), so coming back to the Calendar or a year rebuilds nothing.
 */
const builtYears = new Map<string, { days: unknown; streak: unknown; value: YearDays }>();
const MAX_YEARS = 24;

function buildOnce(key: string, year: number, days: DayRecordsOf, streak: readonly ISODate[]): YearDays {
  const hit = builtYears.get(key);
  if (hit && hit.days === days && hit.streak === streak) return hit.value;
  const value = buildYearDays(year, days, streak);
  builtYears.delete(key);
  builtYears.set(key, { days, streak, value });
  // The oldest entry goes first once there are more years than any person scrolls through.
  if (builtYears.size > MAX_YEARS) builtYears.delete(builtYears.keys().next().value ?? key);
  return value;
}
type DayRecordsOf = Parameters<typeof buildYearDays>[1];

/** Drawn grids, per year's looks (a new looks map, after a log, draws afresh) and per today. */
const drawn = new WeakMap<ReadonlyMap<ISODate, DayLook>, Map<string, GridPaths>>();

function drawOnce(looks: ReadonlyMap<ISODate, DayLook>, key: string, draw: () => GridPaths): GridPaths {
  let grids = drawn.get(looks);
  if (!grids) {
    grids = new Map();
    drawn.set(looks, grids);
  }
  const hit = grids.get(key);
  if (hit) return hit;
  const paths = draw();
  grids.set(key, paths);
  return paths;
}

/** A year's strip, drawn once per year's data and day. */
export function useYearStrip(year: number, looks: ReadonlyMap<ISODate, DayLook>, today: ISODate): GridPaths {
  return useMemo(
    () => drawOnce(looks, `strip|${year}|${today}`, () => yearStrip(year, looks, today)),
    [looks, today, year],
  );
}

/** A month card's grid, drawn once per year's data and day. */
export function useMonthGrid(
  year: number,
  month: number,
  looks: ReadonlyMap<ISODate, DayLook>,
  today: ISODate,
): GridPaths {
  return useMemo(
    () => drawOnce(looks, `month|${year}|${month}|${today}`, () => monthGrid(year, month, looks, today)),
    [looks, month, today, year],
  );
}

/**
 * One year's days as the Calendar draws them: each day's look, and the workouts and no-details days per
 * month. All three levels read this same pair of queries, so moving between them reads nothing again;
 * `enabled` lets a year card load only once it scrolls in.
 */
export function useYearDays(owner: WorkoutOwner, year: number, enabled = true) {
  const from = `${year}-01-01` as ISODate;
  const to = `${year}-12-31` as ISODate;
  const days = useTrainingDays(owner, from, to, enabled);
  const streak = useStreakDays(owner, from, to, enabled);
  const data = useMemo<YearDays | null>(
    () => (days.data && streak.data ? buildOnce(`${owner}|${year}`, year, days.data, streak.data) : null),
    [days.data, owner, streak.data, year],
  );
  const { refetch: refetchDays } = days;
  const { refetch: refetchStreak } = streak;
  return {
    data,
    status: statusOf([days, streak]),
    retry: () => {
      void refetchDays();
      void refetchStreak();
    },
  };
}
