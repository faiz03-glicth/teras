import { useCallback, useMemo } from 'react';

import type { HeatLevel } from '@/features/heatmap/domain/grid';
import {
  buildMonthGrid,
  monthLabel,
  MONTHS_PER_ROW,
  monthRangeLabel,
  recentMonths,
} from '@/features/heatmap/domain/trainingWave';
import { useTrainingDays } from '@/features/heatmap/hooks/useTrainingDays';
import { useSelectedDayStore } from '@/features/heatmap/state/selectedDayStore';
import { useStreakDays } from '@/features/streakDays/hooks/useStreakDays';
import { formatVolume, type WeightUnit } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import type { WorkoutSummary } from '@/features/workouts/data/WorkoutRepository';
import { formatMinutes } from '@/features/workouts/domain/duration';
import { countSets, countWorkouts, exercisePreview } from '@/features/workouts/domain/labels';
import {
  liveWorkout,
  useActiveWorkoutSummary,
  useRecentWorkouts,
  useWorkoutOwner,
} from '@/features/workouts/hooks/useWorkoutQueries';
import { useStartWorkout } from '@/features/workouts/hooks/useStartWorkout';
import { openCalendar, openDay, openSession } from '@/shared/actions';
import { eachDay, firstOfMonth, monthOf, startOfWeek, weekdayLetters } from '@/shared/lib/date/calendar';
import { isISODate, type ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, dayLabel, longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import type { HeatmapMonth } from '@/shared/ui';

/** How many past workouts the feed lists; the Calendar has the rest. */
const FEED_LIMIT = 20;
const WEEK_START = 'mon' as const;
const DAY_LABELS = weekdayLetters(WEEK_START);

/** One card of the workout feed, already worded: the view does no arithmetic. */
export interface FeedEntry {
  id: string;
  name: string;
  /** "Today · 18:20". */
  when: string;
  level: HeatLevel;
  levelName: string;
  /** Time, Volume, Sets. */
  stats: { label: string; value: string }[];
  /** "4 sets" · "Bench Press (Barbell)", for the first few exercises. */
  lines: { sets: string; name: string }[];
  /** "See 2 more exercises". */
  more: string | null;
  accessibilityLabel: string;
}

export type LoadStatus = 'loading' | 'error' | 'ready';

function feedEntry(summary: WorkoutSummary, today: ISODate, unit: WeightUnit): FeedEntry {
  const when = `${dayLabel(summary.date, today)} · ${clockTime(summary.startedAt)}`;
  const levelName = LEVEL_NAMES[summary.dayLevel];
  const time = formatMinutes(summary.durationSeconds);
  const volume = formatVolume(summary.volumeKg, unit);
  const preview = exercisePreview(summary.exercises);
  return {
    id: summary.id,
    name: summary.name,
    when,
    level: summary.dayLevel,
    levelName,
    stats: [
      { label: 'Time', value: time },
      { label: 'Volume', value: volume },
      { label: 'Sets', value: String(summary.sets) },
    ],
    ...preview,
    accessibilityLabel: `${summary.name}, ${levelName}. ${when}. ${time}, ${volume}, ${countSets(summary.sets)}.`,
  };
}

/**
 * Home: the training wave, then what was logged. Everything reads from the device, so Home works
 * offline and as a guest; nothing here waits on Supabase. The wave shows each day's level exactly as it
 * was recorded (frozen), and the workout in progress joins it only when it is finished.
 */
export function useHomeViewModel() {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);

  const months = useMemo(() => recentMonths(today, MONTHS_PER_ROW), [today]);
  // Exactly the days the wave draws, so Home never reads a year to colour three months.
  const from = firstOfMonth(months[0] ?? monthOf(today));
  const days = useTrainingDays(owner, from, today);
  const streakDays = useStreakDays(owner, from, today);
  const feed = useRecentWorkouts(owner, FEED_LIMIT);
  const active = useActiveWorkoutSummary(owner);
  const { start, starting } = useStartWorkout();

  const levels = useMemo(() => new Map((days.data ?? []).map((day) => [day.date, day.level])), [days.data]);
  const streakSet = useMemo(() => new Set(streakDays.data ?? []), [streakDays.data]);
  const wave = useMemo<HeatmapMonth[]>(
    () =>
      months.map((month) => ({
        key: `${month.year}-${month.month}`,
        label: monthLabel(month, today),
        grid: buildMonthGrid(month, {
          levelOn: (day) => levels.get(day) ?? 0,
          streakOn: (day) => streakSet.has(day),
          today,
          weekStart: WEEK_START,
        }),
      })),
    [levels, months, streakSet, today],
  );
  // Stable, so the memoised wave only redraws when what it shows changes.
  const waveRows = useMemo(() => [wave], [wave]);
  const entries = useMemo(
    () => (feed.data ?? []).map((summary) => feedEntry(summary, today, unit)),
    [feed.data, today, unit],
  );

  // Days trained so far this week (Monday on), from the same days the wave draws.
  const daysThisWeek = eachDay(startOfWeek(today, WEEK_START), today).filter(
    (day) => (levels.get(day) ?? 0) > 0,
  ).length;

  const range = monthRangeLabel(months);
  const workouts = days.data?.reduce((sum, day) => sum + day.workouts, 0);
  // Until the workout in progress is known, Home cannot tell "nothing yet" from "one running".
  const status: LoadStatus =
    days.isError || feed.isError || active.isError
      ? 'error'
      : days.isPending || feed.isPending || active.isPending
        ? 'loading'
        : 'ready';
  const waveSubtitle = workouts === undefined ? range : `${range} · ${countWorkouts(workouts)}`;
  const waveHeader = useMemo(
    () => ({ title: 'Training wave', subtitle: waveSubtitle, onPress: openCalendar }),
    [waveSubtitle],
  );

  const { refetch: refetchDays } = days;
  const { refetch: refetchFeed } = feed;
  const { refetch: refetchActive } = active;
  const onRetry = useCallback(() => {
    void refetchDays();
    void refetchFeed();
    void refetchActive();
  }, [refetchActive, refetchDays, refetchFeed]);

  const onDayPress = useCallback((day: string) => {
    if (!isISODate(day)) return;
    haptics.selection();
    openDay(day);
  }, []);
  const onOpenWorkout = useCallback((id: string) => openSession(id), []);

  return {
    dateLine: longDate(today),
    /** "2 this week", beside the title: days trained since Monday. */
    week: {
      label: `${daysThisWeek} this week`,
      accessibilityLabel: `Trained ${daysThisWeek === 1 ? '1 day' : `${daysThisWeek} days`} this week`,
    },
    waveHeader,
    waveRows,
    dayLabels: DAY_LABELS,
    legendCaption: 'vs the same lifts last week',

    status,
    entries,
    /**
     * Nothing logged: Home says so instead of showing an empty list. A workout running has no card of its
     * own here (the Resume bar over the tabs is its way back), so it doesn't fill the list either.
     */
    empty: status === 'ready' && entries.length === 0,
    /** Nothing running: Home starts one in a tap. Running, the Resume bar over the tabs leads back to it. */
    canStart: !active.isPending && !liveWorkout(active.data),
    starting,

    onDayPress,
    onOpenWorkout,
    onStartWorkout: () => void start(),
    onRetry,
  };
}

/** The day whose detail is open, read apart from the rest of Home so a tap re-renders only the wave. */
export function useHomeSelectedDay() {
  return useSelectedDayStore((state) => state.day);
}

export type HomeViewModel = ReturnType<typeof useHomeViewModel>;
