import { useCallback, useMemo, useRef } from 'react';

import type { ExerciseRow, ExerciseType } from '@/core/db/schema';
import { useRepositories } from '@/core/DiProvider';
import type { Highlight } from '@/features/exercises/domain/bodyMap';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/features/exercises/domain/labels';
import { formatRest, formatWeight, LB_PER_KG, type WeightUnit } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { exerciseSummary, weeklyBests } from '@/features/workouts/domain/progress';
import { setLabel } from '@/features/workouts/domain/session';
import {
  useActiveWorkoutSummary,
  useSetActiveWorkout,
  useWorkoutOwner,
} from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack, openExercise, openSession, returnToWorkout } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { shortDate, shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import {
  useExercise,
  useExerciseHistory,
  useExerciseList,
  useFavouriteIds,
  useSetFavourite,
} from '../hooks/useExerciseQueries';

/** How many sessions the history lists, and how many exercises "More for" suggests. */
const HISTORY_ROWS = 6;
const SIMILAR = 4;
const NO_HIGHLIGHT: Highlight = { primary: [], secondary: [] };
/** The chart keeps room for twelve weeks, so a new exercise's few bars stay bar-shaped. */
const CHART_SLOTS = 12;

const TYPE_LABELS: Record<ExerciseType, string> = {
  weighted: 'Weighted',
  bodyweight: 'Bodyweight',
  timed: 'Timed',
};

/** What a record of each type is called. */
const RECORD_LABELS: Record<ExerciseType, string> = {
  weighted: 'Heaviest weight',
  bodyweight: 'Most reps',
  timed: 'Longest hold',
};

/** A record's value as it reads: "62.5 kg", "12 reps" or "1 min 15 s". */
function recordText(type: ExerciseType, value: number, unit: WeightUnit): string {
  if (type === 'weighted') return formatWeight(value, unit);
  if (type === 'bodyweight') return `${value} reps`;
  return formatRest(value);
}

/** Equipment, compound or isolation, how it is measured, and Custom: each said once. */
function tagsOf(row: ExerciseRow): string[] {
  const tags = [
    EQUIPMENT_LABELS[row.equipment],
    row.isCompound ? 'Compound' : 'Isolation',
    TYPE_LABELS[row.type],
    ...(row.isCustom ? ['Custom'] : []),
  ];
  return [...new Set(tags)];
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * One exercise: what it is and works, its record and best estimated max, its best set each week, and the
 * sessions it was done in. Favourite it, or add it to the workout in progress.
 */
export function useExerciseDetailViewModel(id: string | null) {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  const exercise = useExercise(id);
  const history = useExerciseHistory(owner, id);
  const library = useExerciseList(owner);
  const favourites = useFavouriteIds(owner);
  const setFavourite = useSetFavourite(owner);
  const { data: workout } = useActiveWorkoutSummary(owner);
  const cacheWorkout = useSetActiveWorkout(owner);
  const adding = useRef(false);

  const row = exercise.data ?? null;
  const favourite = id !== null && (favourites.data ?? []).includes(id);

  const progress = useMemo(() => {
    if (!row) return null;
    const sessions = history.data ?? [];
    const summary = exerciseSummary(row.type, sessions);
    const record = (value: number) => recordText(row.type, value, unit);
    const weeks = weeklyBests(row.type, sessions);
    const latest = weeks.at(-1);
    // A weight is charted in the unit chosen; reps and seconds are the same in either.
    const shown = (value: number) => (row.type === 'weighted' && unit === 'lb' ? value * LB_PER_KG : value);
    return {
      stats:
        summary.sessions === 0
          ? []
          : [
              {
                label: RECORD_LABELS[row.type],
                value: record(summary.best),
                record: true,
                accessibilityLabel: `${RECORD_LABELS[row.type]}, ${record(summary.best)}, personal record`,
              },
              summary.e1rm === null
                ? {
                    label: 'Sessions',
                    value: String(summary.sessions),
                    record: false,
                    accessibilityLabel: `Sessions, ${summary.sessions}`,
                  }
                : {
                    label: 'Estimated 1RM',
                    value: formatWeight(summary.e1rm, unit),
                    record: false,
                    accessibilityLabel: `Estimated 1RM, ${formatWeight(summary.e1rm, unit)}`,
                  },
            ],
      chart:
        latest === undefined
          ? null
          : {
              values: weeks.map((week) => shown(week.value)),
              // The first and latest week, under the bars at either end. One week's bar is too narrow
              // to carry a date, so it goes without.
              labels:
                weeks.length > 1
                  ? [shortDate(weeks[0]?.week ?? latest.week, today), shortDate(latest.week, today)]
                  : undefined,
              slots: CHART_SLOTS,
              accessibilityLabel: `Best set each week, ${plural(weeks.length, 'week')}, latest ${record(latest.value)}`,
            },
      sessionCount: plural(summary.sessions, 'session'),
      sessions: sessions.slice(0, HISTORY_ROWS).map((session) => {
        const title = `${shortDay(session.date, today)} · ${session.name}`;
        const sets = session.sets.map((set) => setLabel(set, row.type, unit)).join(' · ');
        const isRecord = summary.recordIds.includes(session.workoutId);
        return {
          id: session.workoutId,
          title,
          sets,
          record: isRecord,
          accessibilityLabel: `${title}, ${sets}${isRecord ? ', personal record' : ''}`,
        };
      }),
    };
  }, [history.data, row, today, unit]);

  const similar = useMemo(
    () =>
      row
        ? (library.data ?? [])
            .filter((one) => one.primaryMuscle === row.primaryMuscle && one.id !== row.id)
            .slice(0, SIMILAR)
            .map((one) => ({ id: one.id, name: one.name }))
        : [],
    [library.data, row],
  );

  const onAddToWorkout = useCallback(async () => {
    if (!workout || !id || adding.current) return;
    adding.current = true;
    try {
      cacheWorkout(await workouts.addExercise(workout.id, id, restSeconds));
      haptics.success();
      returnToWorkout();
    } catch (cause) {
      console.error(
        `[exercises] Could not add an exercise (${cause instanceof Error ? cause.name : 'unknown'})`,
      ); // TODO(Sentry)
      showInfo({ title: "Couldn't add exercise", sub: 'Try again.' });
    } finally {
      adding.current = false;
    }
  }, [cacheWorkout, id, restSeconds, workout, workouts]);

  const { mutate } = setFavourite;
  const onToggleFavourite = useCallback(() => {
    if (!id) return;
    haptics.selection();
    mutate(
      { exerciseId: id, favourite: !favourite },
      { onError: () => showInfo({ title: "Couldn't save", sub: 'Try again.' }) },
    );
  }, [favourite, id, mutate]);

  const { refetch: refetchExercise } = exercise;
  const { refetch: refetchHistory } = history;
  const onRetry = useCallback(() => {
    void refetchExercise();
    void refetchHistory();
  }, [refetchExercise, refetchHistory]);

  const status =
    id === null
      ? ('missing' as const)
      : exercise.isError || history.isError
        ? ('error' as const)
        : exercise.isPending || (row !== null && history.isPending)
          ? ('loading' as const)
          : row === null
            ? ('missing' as const)
            : ('ready' as const);

  return {
    status,
    name: row?.name ?? '',
    tags: row ? tagsOf(row) : [],
    primary: row ? MUSCLE_LABELS[row.primaryMuscle] : '',
    secondary: row?.secondaryMuscles.length
      ? row.secondaryMuscles.map((one) => MUSCLE_LABELS[one]).join(', ')
      : 'None',
    highlight: row ? { primary: [row.primaryMuscle], secondary: row.secondaryMuscles } : NO_HIGHLIGHT,
    favourite,
    canAdd: workout != null,
    stats: progress?.stats ?? [],
    chart: progress?.chart ?? null,
    sessionCount: progress?.sessionCount ?? '',
    sessions: progress?.sessions ?? [],
    similarTitle: row ? `More for ${MUSCLE_LABELS[row.primaryMuscle].toLowerCase()}` : '',
    similar,
    onBack: () => goBack(),
    onToggleFavourite,
    onAddToWorkout: () => void onAddToWorkout(),
    onOpenSession: (workoutId: string) => openSession(workoutId),
    onOpenExercise: (exerciseId: string) => openExercise(exerciseId),
    onRetry,
  };
}

export type ExerciseDetailViewModel = ReturnType<typeof useExerciseDetailViewModel>;
