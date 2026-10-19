import { hashKey, type Query, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '@/core/DiProvider';
import { trainingDaysKey, useTrainingDays } from '@/features/heatmap/hooks/useTrainingDays';
import { formatVolume } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { pushDaysNow } from '@/features/workoutDays/data/pushDaysNow';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { goBack, openActiveWorkout, openExercise, useScreenSettled } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { clockTime, shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';

import { formatMinutes, sessionSeconds } from '../domain/duration';
import { countSets } from '../domain/labels';
import { recordSetIds } from '../domain/records';
import { loggedExercises, setLabel } from '../domain/session';
import { workoutTotals } from '../domain/totals';
import {
  exerciseBestsKey,
  loggedWorkoutKey,
  useExerciseBests,
  useLoggedWorkout,
  useWorkoutOwner,
  workoutKeys,
} from '../hooks/useWorkoutQueries';

/**
 * Exercises drawn while the screen slides in: below its heading and numbers, more than a phone shows at
 * once. The rest follow once it has settled, so the slide waits for a screenful, not the whole workout.
 */
export const FIRST_EXERCISES = 4;

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
  const settled = useScreenSettled();
  const shown = useMemo(
    () => (settled ? exercises : exercises.slice(0, FIRST_EXERCISES)),
    [exercises, settled],
  );

  const { refetch } = query;
  const { refetch: refetchDay } = day;
  const { refetch: refetchBests } = bests;
  const onRetry = useCallback(() => {
    void refetch();
    void refetchDay();
    void refetchBests();
  }, [refetch, refetchDay, refetchBests]);

  const [deleting, setDeleting] = useState(false);
  // Set once the workout is gone: the day and records this screen still shows. They are refreshed, and
  // its own copy of the workout dropped, when the screen closes, not before, so it never says "Workout not
  // found" or loses its level and PR marks while it slides away, and does no reading mid-transition.
  const shownOnClose = useRef<QueryKey[] | null>(null);
  useEffect(
    () => () => {
      const shown = shownOnClose.current;
      if (!shown) return;
      queryClient.removeQueries({ queryKey: loggedWorkoutKey(owner, id), exact: true });
      for (const queryKey of shown) void queryClient.invalidateQueries({ queryKey, exact: true });
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
      // A native alert, not a toast: on Android, toasts stop drawing after the confirm Alert above.
      Alert.alert("Couldn't delete", 'Try again.');
      setDeleting(false);
      return;
    }
    // The feed, the Calendar, the records and the heatmap all read this workout or its day. What this
    // screen itself shows is left alone until it closes (see `shownOnClose`).
    const shown: QueryKey[] = [
      trainingDaysKey(owner, workout.date, workout.date),
      exerciseBestsKey(
        owner,
        logged.map((exercise) => exercise.exerciseId),
      ),
    ];
    shownOnClose.current = shown;
    const onScreen = new Set([loggedWorkoutKey(owner, workout.id), ...shown].map((key) => hashKey(key)));
    const elsewhere = (query: Query) => !onScreen.has(query.queryHash);
    void queryClient.invalidateQueries({ queryKey: workoutKeys.history, predicate: elsewhere });
    void queryClient.invalidateQueries({ queryKey: workoutKeys.days, predicate: elsewhere });
    // A routine's card says when it was last done: that may have been this workout.
    void queryClient.invalidateQueries({ queryKey: workoutKeys.routines(owner) });
    // The rewritten day reaches the server (and Streak) now, not at the next time the app is opened.
    pushDaysNow(workoutDays, owner);
    haptics.success();
    goBack();
  }, [deleting, logged, owner, queryClient, workout, workoutDays, workouts]);

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
    exercises: shown,
    deleting,
    onDelete,
    onRetry,
    onOpenExercise: openExercise,
    onBack: () => goBack(),
  };
}

export type SessionViewModel = ReturnType<typeof useSessionViewModel>;
