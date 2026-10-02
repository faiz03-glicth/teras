import { useCallback, useEffect, useMemo } from 'react';

import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { dayStanding } from '@/features/workoutDays/domain/heatLevel';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { formatMinutes } from '@/features/workouts/domain/duration';
import { countSets } from '@/features/workouts/domain/labels';
import {
  useActiveWorkout,
  useWorkoutOwner,
  useWorkoutsBetween,
} from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openActiveWorkout, openSession } from '@/shared/actions';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, shortDay } from '@/shared/lib/format/dates';

import { standingLine } from '../domain/standing';
import { useDayWindow, useTrainingDays } from '../hooks/useTrainingDays';
import { useSelectedDayStore } from '../state/selectedDayStore';

/** A workout listed in a day's sheet. */
export interface DayWorkoutRow {
  id: string;
  title: string;
  /** "18:20 · 62 min · 14 sets". */
  meta: string;
}

/**
 * One day of the wave, as a sheet over it: the level the day was recorded at, what it was judged
 * against, and the workouts that made it. A bad or future link opens today. While the sheet is up its day
 * stays ringed on the wave underneath, so it is plain which cell was opened.
 */
export function useDaySheetViewModel(date: ISODate | null) {
  const today = useToday();
  const day = date && date <= today ? date : today;
  const owner = useWorkoutOwner();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const select = useSelectedDayStore((state) => state.select);
  const release = useSelectedDayStore((state) => state.release);

  useEffect(() => {
    select(day);
    return () => release(day);
  }, [day, release, select]);

  const record = useTrainingDays(owner, day, day);
  const window = useDayWindow(owner, day);
  const workouts = useWorkoutsBetween(owner, day, day);
  const active = useActiveWorkout(owner);

  const row = record.data?.[0] ?? null;
  const level = row?.level ?? 0;
  const running = active.data && active.data.date === day ? active.data : null;
  const standing = dayStanding(row, window.data ?? []);

  const rows = useMemo<DayWorkoutRow[]>(
    () =>
      (workouts.data ?? []).map((summary) => ({
        id: summary.id,
        title: summary.name,
        meta: `${clockTime(summary.startedAt)} · ${formatMinutes(summary.durationSeconds)} · ${countSets(summary.sets)}`,
      })),
    [workouts.data],
  );

  const failed = record.isError || window.isError || workouts.isError;
  const pending = record.isPending || window.isPending || workouts.isPending;
  const { refetch: refetchRecord } = record;
  const { refetch: refetchWindow } = window;
  const { refetch: refetchWorkouts } = workouts;
  const onRetry = useCallback(() => {
    void refetchRecord();
    void refetchWindow();
    void refetchWorkouts();
  }, [refetchRecord, refetchWindow, refetchWorkouts]);

  // A workout opened from here takes the sheet's place: Back returns to the wave, as in the prototype.
  const onOpenWorkout = useCallback((id: string) => openSession(id, { replace: true }), []);
  const onResume = useCallback(() => openActiveWorkout({ replace: true }), []);

  const levelName = LEVEL_NAMES[level];
  const line = standingLine(standing, unit, { today: day === today, running: running !== null });

  return {
    day,
    eyebrow: day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : undefined,
    title: shortDay(day, today),
    level,
    levelName,
    standing: line,
    summaryLabel: `${levelName}. ${line}.`,

    status: failed ? ('error' as const) : pending ? ('loading' as const) : ('ready' as const),
    rows,
    inProgress: running
      ? { title: running.name, meta: `In progress · started ${clockTime(running.startedAt)}` }
      : null,

    onOpenWorkout,
    onResume,
    onRetry,
    onClose: () => goBack(),
  };
}

export type DaySheetViewModel = ReturnType<typeof useDaySheetViewModel>;
