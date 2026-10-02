import { useCallback, useMemo } from 'react';

import type { HeatGridCell } from '@/features/heatmap/domain/grid';
import { standingLine } from '@/features/heatmap/domain/standing';
import { dayCell } from '@/features/heatmap/domain/trainingWave';
import { useDayWindow, useTrainingDays } from '@/features/heatmap/hooks/useTrainingDays';
import { formatVolume } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { dayStanding } from '@/features/workoutDays/domain/heatLevel';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { goHome } from '@/shared/actions';
import { addDays, eachDay, startOfWeek, weekdayLetters } from '@/shared/lib/date/calendar';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, dayLabel } from '@/shared/lib/format/dates';

import type { Workout } from '../data/WorkoutRepository';
import { formatMinutes, sessionSeconds } from '../domain/duration';
import { recordLine } from '../domain/records';
import { workoutTotals } from '../domain/totals';
import { useLoggedWorkout, useNewRecords, useWorkoutOwner } from '../hooks/useWorkoutQueries';

const WEEK_START = 'mon' as const;
const DAY_LETTERS = weekdayLetters(WEEK_START);

/** How much of what was planned was done: "2/4" sets, "1/2" exercises. */
function completion(workout: Workout) {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const done = (status: string) => status === 'done';
  return {
    sets: `${sets.filter((set) => done(set.status)).length}/${sets.length}`,
    exercises: `${workout.exercises.filter((exercise) => exercise.sets.some((set) => done(set.status))).length}/${workout.exercises.length}`,
  };
}

/**
 * What a just-finished workout came to: its numbers against what was planned, and the level its day
 * was recorded at, among the rest of its week. Everything is read back — the level is the frozen one
 * Finish wrote, never worked out again here.
 */
export function useWorkoutSavedViewModel(id: string | null) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const query = useLoggedWorkout(owner, id);
  const workout = query.data ?? null;
  const date = workout?.date ?? today;
  const weekStart = startOfWeek(date, WEEK_START);
  const week = useTrainingDays(owner, weekStart, addDays(weekStart, 6), workout !== null);
  const baseline = useDayWindow(owner, date);
  const records = useNewRecords(owner, id);

  const recorded = week.data?.find((one) => one.date === date) ?? null;
  const days = useMemo<HeatGridCell[]>(() => {
    const levels = new Map((week.data ?? []).map((one) => [one.date, one.level]));
    return eachDay(weekStart, addDays(weekStart, 6)).map((one) =>
      dayCell(one, { levelOn: (key) => levels.get(key) ?? 0, today, weekStart: WEEK_START }),
    );
  }, [today, week.data, weekStart]);

  const { refetch } = query;
  const { refetch: refetchWeek } = week;
  const { refetch: refetchWindow } = baseline;
  const { refetch: refetchRecords } = records;
  const onRetry = useCallback(() => {
    void refetch();
    void refetchWeek();
    void refetchWindow();
    void refetchRecords();
  }, [refetch, refetchRecords, refetchWeek, refetchWindow]);

  const status =
    id === null
      ? ('missing' as const)
      : query.isError || week.isError || baseline.isError || records.isError
        ? ('error' as const)
        : query.isPending || (workout !== null && (week.isPending || baseline.isPending || records.isPending))
          ? ('loading' as const)
          : workout === null
            ? ('missing' as const)
            : ('ready' as const);

  const level = recorded?.level ?? 0;
  const totals = workout ? workoutTotals(workout) : null;
  const done = workout ? completion(workout) : null;
  const recordRows = (records.data ?? []).map((record) => ({
    id: record.exerciseId,
    name: record.name,
    line: recordLine(record, unit),
  }));

  return {
    status,
    title: workout
      ? `${workout.name} · ${dayLabel(workout.date, today)} · ${clockTime(workout.startedAt)}`
      : '',
    stats:
      workout && totals && done
        ? [
            { label: 'Duration', value: formatMinutes(sessionSeconds(workout.startedAt, workout.endedAt)) },
            { label: 'Volume', value: formatVolume(totals.volumeKg, unit) },
            { label: 'Sets', value: done.sets },
            { label: 'Exercises', value: done.exercises },
          ]
        : [],
    records: {
      title:
        recordRows.length === 0
          ? 'No new records this time'
          : `${recordRows.length} new personal record${recordRows.length === 1 ? '' : 's'}`,
      rows: recordRows,
      note: 'Records come from your heaviest weight, most reps and longest hold on each exercise.',
    },
    level,
    levelName: LEVEL_NAMES[level],
    standing: standingLine(dayStanding(recorded, baseline.data ?? []), unit, {
      today: date === today,
      running: false,
    }),
    week: { days, letters: DAY_LETTERS, ringed: date },
    weekLabel: `This week. ${days
      .filter((one) => one.label)
      .map((one) => one.label)
      .join('. ')}`,
    onRetry,
    onDone: () => goHome(),
  };
}

export type WorkoutSavedViewModel = ReturnType<typeof useWorkoutSavedViewModel>;
