import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useStreakDays } from '@/features/streakDays/hooks/useStreakDays';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { dayStanding } from '@/features/workoutDays/domain/heatLevel';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { formatMinutes } from '@/features/workouts/domain/duration';
import { countSets } from '@/features/workouts/domain/labels';
import {
  liveWorkout,
  useActiveWorkoutSummary,
  useRoutines,
  useSetActiveWorkout,
  useWorkoutOwner,
  useWorkoutsBetween,
} from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openActiveWorkout, openSession } from '@/shared/actions';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

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
 * stays ringed on the wave underneath, so it is plain which cell was opened. Any day up to today can have
 * a workout logged on it, from a routine or empty.
 */
export function useDaySheetViewModel(date: ISODate | null) {
  const today = useToday();
  const day = date && date <= today ? date : today;
  const owner = useWorkoutOwner();
  const routines = useRoutines(owner);
  const { workouts: workoutRepository } = useRepositories();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const bodyweightKg = useTrainingPreferencesStore((state) => state.bodyweightKg);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  const cacheWorkout = useSetActiveWorkout(owner);
  const [starting, setStarting] = useState<string | null>(null);
  const select = useSelectedDayStore((state) => state.select);
  const release = useSelectedDayStore((state) => state.release);

  useEffect(() => {
    select(day);
    return () => release(day);
  }, [day, release, select]);

  const record = useTrainingDays(owner, day, day);
  const window = useDayWindow(owner, day);
  const workouts = useWorkoutsBetween(owner, day, day);
  const active = useActiveWorkoutSummary(owner);
  const streakDays = useStreakDays(owner, day, day);

  const row = record.data?.[0] ?? null;
  const level = row?.level ?? 0;
  const running = active.data && active.data.date === day ? active.data : null;
  // A past day's log is not in progress: it is listed as not saved yet, to save or discard.
  const live = liveWorkout(running);
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

  // A Workout check-in on Streak with nothing here (checked in on Streak, or logged here with no details):
  // the day is logged, without its lifts. It counts, and is never a rest day. Once a workout is logged
  // here, that is the day.
  const loggedHere = (row?.sets ?? 0) > 0 || rows.length > 0 || running !== null;
  const loggedNoDetails = !loggedHere && (streakDays.data ?? []).includes(day);
  const elsewhere = active.data ?? null;

  // A failed read of the Streak copy only leaves the Streak line out; it never fails the day.
  const failed = record.isError || window.isError || workouts.isError;
  const pending =
    record.isPending ||
    window.isPending ||
    workouts.isPending ||
    (streakDays.isPending && !streakDays.isError);
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

  const logWorkout = useCallback(
    async (key: string) => {
      // One workout at a time: the one already running is finished first.
      if (elsewhere) {
        openActiveWorkout({ replace: true });
        return;
      }
      if (starting) return;
      setStarting(key);
      try {
        const workout = await workoutRepository.start(owner, {
          date: day,
          bodyweightKg,
          restSeconds,
          routineId: key === 'empty' ? undefined : key,
        });
        cacheWorkout(workout);
        haptics.success();
        openActiveWorkout({ replace: true });
      } catch (cause) {
        console.error(`[workouts] Could not start (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
        showInfo({ title: "Couldn't start", sub: 'Try again.' });
      } finally {
        setStarting(null);
      }
    },
    [bodyweightKg, cacheWorkout, day, elsewhere, owner, restSeconds, starting, workoutRepository],
  );

  const logOptions = useMemo(
    () => [
      ...(routines.data ?? [])
        .filter((routine) => routine.exerciseCount > 0)
        .map((routine) => ({
          key: routine.id,
          title: routine.name,
          description: `${routine.exerciseCount} exercise${routine.exerciseCount === 1 ? '' : 's'}`,
          starting: starting === routine.id,
        })),
      {
        key: 'empty',
        title: 'Empty workout',
        description: 'Add exercises as you go',
        starting: starting === 'empty',
      },
    ],
    [routines.data, starting],
  );
  const onLog = useCallback((key: string) => void logWorkout(key), [logWorkout]);

  // A day with nothing logged is a rest day (the owner, 18 Oct): "No workout · Rest day".
  const levelName = loggedNoDetails ? 'Logged' : LEVEL_NAMES[level];
  const line = loggedNoDetails
    ? 'No details · counts toward your Streak'
    : standingLine(standing, unit, { today: day === today, running: live !== null });

  return {
    day,
    eyebrow: day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : undefined,
    title: shortDay(day, today),
    level,
    /** Logged with no details: the cell carries the gold mark. */
    marked: loggedNoDetails,
    levelName,
    standing: line,
    summaryLabel: line ? `${levelName}. ${line}.` : `${levelName}.`,

    status: failed ? ('error' as const) : pending ? ('loading' as const) : ('ready' as const),
    rows,
    inProgress: live
      ? { title: live.name, meta: `In progress · started ${clockTime(live.startedAt)}` }
      : null,
    /** This day's log, left before it was saved (the app closed): open it to save or discard it. */
    unsaved: running?.pastLog ? { title: running.name, meta: 'Not saved yet · save or discard it' } : null,
    /** Log a workout on this day, unless one already runs on it (it is listed above). */
    log: running
      ? null
      : {
          title: loggedNoDetails ? 'Add the workout' : day === today ? 'Start a workout' : 'Log a workout',
          note: loggedNoDetails ? 'The day stays logged either way.' : null,
          blockedBy: !elsewhere
            ? null
            : elsewhere.pastLog
              ? `Save or discard your log for ${shortDay(elsewhere.date, today)} first`
              : 'Finish the workout in progress first',
          options: elsewhere ? [] : logOptions,
        },
    onLog,
    onResume,
    onOpenWorkout,
    onRetry,
    onClose: () => goBack(),
  };
}

export type DaySheetViewModel = ReturnType<typeof useDaySheetViewModel>;
