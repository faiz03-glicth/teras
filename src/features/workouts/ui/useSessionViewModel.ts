import { useCallback, useEffect, useMemo } from 'react';

import { useTrainingDays } from '@/features/heatmap/hooks/useTrainingDays';
import { formatVolume } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { goBack, openActiveWorkout, openExercise } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, shortDay } from '@/shared/lib/format/dates';

import { formatMinutes, sessionSeconds } from '../domain/duration';
import { countSets } from '../domain/labels';
import { recordSetIds } from '../domain/records';
import { loggedExercises, setLabel } from '../domain/session';
import { workoutTotals } from '../domain/totals';
import { useExerciseBests, useLoggedWorkout, useWorkoutOwner } from '../hooks/useWorkoutQueries';

/** One exercise of a logged workout, its completed sets already worded. */
export interface SessionExerciseView {
  id: string;
  /** The library entry, which its heading opens. */
  exerciseId: string;
  name: string;
  /** "4 sets". */
  count: string;
  /** `record`: the set that holds the exercise's personal record, as Exercise detail marks it. */
  sets: { id: string; number: string; label: string; record: boolean }[];
}

/**
 * A logged workout, exactly as it was recorded: one screen whether it was opened from the feed, the
 * Calendar or a day's sheet. It only reads — nothing here can change a past workout. Its volume uses the
 * very rule its day was recorded with, and its level is that day's frozen one, read back. A set is marked
 * PR while it holds the exercise's record, the rule Exercise detail marks its history with, so the two
 * screens never disagree about the same workout.
 */
export function useSessionViewModel(id: string | null) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const query = useLoggedWorkout(owner, id);
  const workout = query.data ?? null;
  const day = useTrainingDays(owner, workout?.date ?? today, workout?.date ?? today, workout !== null);

  // A workout still running belongs on its own screen, where sets can be ticked: go there instead.
  const running = workout !== null && workout.endedAt === null;
  useEffect(() => {
    if (running) openActiveWorkout({ replace: true });
  }, [running]);

  const logged = useMemo(() => loggedExercises(workout?.exercises ?? []), [workout]);
  const bests = useExerciseBests(
    owner,
    logged.map((exercise) => exercise.exerciseId),
    workout !== null && !running,
  );
  // A workout with nothing completed has no records to look up; there is nothing to wait for.
  const bestsPending = logged.length > 0 && bests.isPending;

  const exercises = useMemo<SessionExerciseView[]>(() => {
    const recordSets = recordSetIds(logged, bests.data ?? {});
    return logged.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      count: countSets(exercise.sets.length),
      sets: exercise.sets.map((set, index) => ({
        id: set.id,
        number: String(index + 1),
        label: setLabel(set, exercise.type, unit),
        record: recordSets.has(set.id),
      })),
    }));
  }, [bests.data, logged, unit]);

  const { refetch } = query;
  const { refetch: refetchDay } = day;
  const { refetch: refetchBests } = bests;
  const onRetry = useCallback(() => {
    void refetch();
    void refetchDay();
    void refetchBests();
  }, [refetch, refetchDay, refetchBests]);

  // The level and the records are shown only once read back: never a stand-in "No workout" meanwhile,
  // and no PR label appearing under someone already reading the sets.
  const status =
    id === null
      ? ('missing' as const)
      : query.isError || day.isError || bests.isError
        ? ('error' as const)
        : query.isPending || running || (workout !== null && (day.isPending || bestsPending))
          ? ('loading' as const)
          : workout === null
            ? ('missing' as const)
            : ('ready' as const);

  const level = day.data?.[0]?.level ?? 0;
  const totals = workout ? workoutTotals(workout) : null;

  return {
    status,
    name: workout?.name ?? '',
    when: workout ? `${shortDay(workout.date, today)} · ${clockTime(workout.startedAt)}` : '',
    level,
    levelName: LEVEL_NAMES[level],
    stats: workout
      ? [
          { label: 'Time', value: formatMinutes(sessionSeconds(workout.startedAt, workout.endedAt)) },
          { label: 'Volume', value: formatVolume(totals?.volumeKg ?? 0, unit) },
          { label: 'Sets', value: String(totals?.sets ?? 0) },
        ]
      : [],
    exercises,
    onRetry,
    onOpenExercise: openExercise,
    onBack: () => goBack(),
  };
}

export type SessionViewModel = ReturnType<typeof useSessionViewModel>;
