import { useCallback, useMemo } from 'react';

import { formatVolume } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { formatMinutes } from '@/features/workouts/domain/duration';
import { countWorkouts } from '@/features/workouts/domain/labels';
import { useWorkoutOwner, useWorkoutsBetween } from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openDay, openSession } from '@/shared/actions';
import { minDay, monthLong, monthOf, weekdayLetters } from '@/shared/lib/date/calendar';
import { isISODate, type ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import type { HeatmapMonth } from '@/shared/ui';

import type { HeatLevel } from '../domain/grid';
import { groupByMonth } from '../domain/monthGroups';
import { buildMonthGrid, calendarRows, monthLabel } from '../domain/trainingWave';
import { useTrainingDays } from '../hooks/useTrainingDays';
import { useSelectedDayStore } from '../state/selectedDayStore';

const WEEK_START = 'mon' as const;
const DAY_LABELS = weekdayLetters(WEEK_START);
/** Before any training could have been logged: "everything so far" as a range. */
const BEGINNING = '2000-01-01' as ISODate;

/** A workout in the Calendar's list: its day's colour, its name, and its numbers on one line. */
export interface CalendarRow {
  id: string;
  title: string;
  /** "Mon, 28 Sep · 62 min · 4,820 kg · Strong". */
  meta: string;
  level: HeatLevel;
}

export interface CalendarMonth {
  key: string;
  /** "September · 8 workouts" ("September 2025 · …" in an earlier year). */
  title: string;
  rows: CalendarRow[];
}

/**
 * The full training wave: every month from the first training day to this one, three to a row, newest
 * first (the first row is exactly Home's), then every workout listed by month. All of it is read in two
 * queries, and the colours are the frozen levels, never recomputed.
 */
export function useCalendarViewModel() {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const selected = useSelectedDayStore((state) => state.day);

  const days = useTrainingDays(owner, BEGINNING, today);
  const workouts = useWorkoutsBetween(owner, BEGINNING, today);

  const levels = useMemo(() => new Map((days.data ?? []).map((day) => [day.date, day.level])), [days.data]);
  // Days come oldest first and workouts newest first: the earliest of either is where the wave begins.
  const firstDay = days.data?.[0]?.date ?? null;
  const firstWorkout = workouts.data?.at(-1)?.date ?? null;
  const earliest = firstDay && firstWorkout ? minDay(firstDay, firstWorkout) : (firstDay ?? firstWorkout);

  const rows = useMemo<HeatmapMonth[][]>(
    () =>
      calendarRows(today, earliest).map((row) =>
        row.map((month) => ({
          key: `${month.year}-${month.month}`,
          label: monthLabel(month, today),
          grid: buildMonthGrid(month, {
            levelOn: (day) => levels.get(day) ?? 0,
            today,
            weekStart: WEEK_START,
          }),
        })),
      ),
    [earliest, levels, today],
  );

  const months = useMemo<CalendarMonth[]>(() => {
    const thisYear = monthOf(today).year;
    return groupByMonth(workouts.data ?? []).map(({ month, items }) => ({
      key: `${month.year}-${month.month}`,
      title: `${monthLong(month.month)}${month.year === thisYear ? '' : ` ${month.year}`} · ${countWorkouts(items.length)}`,
      rows: items.map((summary) => ({
        id: summary.id,
        title: summary.name,
        meta: [
          shortDay(summary.date),
          formatMinutes(summary.durationSeconds),
          formatVolume(summary.volumeKg, unit),
          LEVEL_NAMES[summary.dayLevel],
        ].join(' · '),
        level: summary.dayLevel,
      })),
    }));
  }, [today, unit, workouts.data]);

  const { refetch: refetchDays } = days;
  const { refetch: refetchWorkouts } = workouts;
  const onRetry = useCallback(() => {
    void refetchDays();
    void refetchWorkouts();
  }, [refetchDays, refetchWorkouts]);

  const onDayPress = useCallback((day: string) => {
    if (!isISODate(day)) return;
    haptics.selection();
    openDay(day);
  }, []);
  const onOpenWorkout = useCallback((id: string) => openSession(id), []);

  return {
    rows,
    selected,
    dayLabels: DAY_LABELS,
    legendCaption: 'vs your last 90 days',
    months,
    status:
      days.isError || workouts.isError
        ? ('error' as const)
        : days.isPending || workouts.isPending
          ? ('loading' as const)
          : ('ready' as const),
    onDayPress,
    onOpenWorkout,
    onRetry,
    onBack: () => goBack(),
  };
}

export type CalendarViewModel = ReturnType<typeof useCalendarViewModel>;
