import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '@/core/DiProvider';
import { useTrainingDays } from '@/features/heatmap/hooks/useTrainingDays';
import { formatVolume } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { pushDaysNow } from '@/features/workoutDays/data/pushDaysNow';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { goBack, openActiveWorkout, openExercise } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { formatMinutes, sessionSeconds } from '../domain/duration';
import { countSets } from '../domain/labels';
import { recordSetIds } from '../domain/records';
import { loggedExercises, setLabel } from '../domain/session';
import { workoutTotals } from '../domain/totals';
import {
  loggedWorkoutKey,
  useExerciseBests,
  useLoggedWorkout,
  useWorkoutOwner,
  workoutKeys,
} from '../hooks/useWorkoutQueries';

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
 * Calendar or a day's sheet. Nothing here edits a past workout; the one change is deleting it, which
 * rewrites its day from the workouts that remain. Its volume uses the very rule its day was recorded
 * with, and its level is that day's frozen one, read back. A set is marked PR while it holds the
 * exercise's record, the rule Exercise detail marks its history with, so the two screens never disagree
 * about the same workout.
 */
export function useSessionViewModel(id: string | null) {
  const { workouts, workoutDays } = useRepositories();
  const queryClient = useQueryClient();
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

  const [deleting, setDeleting] = useState(false);
  // Set once the workout is gone. This screen's own copy of it is dropped when the screen closes, not
  // before, so it never says "Workout not found" while it slides away.
  const deleted = useRef(false);
  useEffect(
    () => () => {
      if (deleted.current) queryClient.removeQueries({ queryKey: loggedWorkoutKey(owner, id), exact: true });
    },
    [id, owner, queryClient],
  );

  const remove = useCallback(async () => {
    if (!workout || deleting) return;
    setDeleting(true);
    try {
      await workouts.deleteLogged(owner, workout.id);
    } catch (cause) {
      console.error(
        `[workouts] Could not delete a workout (${cause instanceof Error ? cause.name : 'unknown'})`,
      ); // TODO(Sentry)
      showInfo({ title: "Couldn't delete", sub: 'Try again.' });
      setDeleting(false);
      return;
    }
    deleted.current = true;
    // The feed, the Calendar, the records and the heatmap all read this workout or its day. This screen's
    // own copy is left alone until it closes (see `deleted`).
    const own = loggedWorkoutKey(owner, workout.id);
    void queryClient.invalidateQueries({
      queryKey: workoutKeys.history,
      predicate: (query) =>
        query.queryKey.length !== own.length || query.queryKey.some((part, index) => part !== own[index]),
    });
    void queryClient.invalidateQueries({ queryKey: workoutKeys.days });
    // A routine's card says when it was last done: that may have been this workout.
    void queryClient.invalidateQueries({ queryKey: workoutKeys.routines(owner) });
    // The rewritten day reaches the server (and Streak) now, not at the next time the app is opened.
    pushDaysNow(workoutDays, owner);
    haptics.success();
    goBack();
  }, [deleting, owner, queryClient, workout, workoutDays, workouts]);

  const onDelete = useCallback(() => {
    if (!workout) return;
    const { sets } = workoutTotals(workout);
    Alert.alert(
      'Delete workout?',
      sets > 0
        ? `Its ${sets} completed ${sets === 1 ? 'set' : 'sets'} will be deleted. This can't be undone.`
        : "This can't be undone.",
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove() },
      ],
    );
  }, [remove, workout]);

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
    deleting,
    onDelete,
    onRetry,
    onOpenExercise: openExercise,
    onBack: () => goBack(),
  };
}

export type SessionViewModel = ReturnType<typeof useSessionViewModel>;
