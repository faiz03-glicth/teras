import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '@/core/DiProvider';
import { formatVolume, REST_SECONDS } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goBack, openAddExercise, openWorkoutSaved } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import type { SetPatch, Workout } from '../data/WorkoutRepository';
import { previousText } from '../domain/setUnits';
import { workoutTotals } from '../domain/totals';
import {
  useActiveWorkout,
  usePreviousSets,
  useSetActiveWorkout,
  useWorkoutOwner,
  workoutKeys,
} from '../hooks/useWorkoutQueries';
import { useRestTimerStore } from '../state/restTimerStore';

/** A rest that ended this long before it was seen (the app was closed) is cleared without a word. */
const STALE_REST_MS = 5000;

/** The sets of a workout, counted: what is done and what is still unticked. */
function setCounts(workout: Workout | null | undefined) {
  const sets = workout?.exercises.flatMap((exercise) => exercise.sets) ?? [];
  const done = sets.filter((set) => set.status === 'done').length;
  return { done, unticked: sets.length - done };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * The rest between sets. It is kept outside the screen (`restTimerStore`), so leaving the workout and
 * coming back finds it still counting; it belongs to one workout, so a stale rest never shows on the next.
 * Only its end time is held here: the rest bar counts itself down, so the seconds never redraw the screen.
 */
function useRest(workoutId: string | undefined) {
  const endsAt = useRestTimerStore((state) =>
    workoutId !== undefined && state.workoutId === workoutId ? state.endsAt : null,
  );
  const start = useRestTimerStore((state) => state.start);
  const adjust = useRestTimerStore((state) => state.adjust);
  const stop = useRestTimerStore((state) => state.stop);

  return {
    endsAt,
    start: useCallback(
      (seconds: number) => {
        if (workoutId) start(workoutId, seconds, Date.now());
      },
      [start, workoutId],
    ),
    adjust: useCallback((direction: 1 | -1) => adjust(direction, Date.now()), [adjust]),
    stop,
    /** Over: say so once, if it ended while the workout was in view. */
    over: useCallback(() => {
      if (endsAt === null) return;
      stop();
      if (Date.now() - new Date(endsAt).getTime() > STALE_REST_MS) return;
      haptics.success();
      showInfo({ title: 'Rest over', sub: 'Next set' });
    }, [endsAt, stop]),
  };
}

/**
 * The workout in progress. Every change goes straight to SQLite and the result replaces what is on
 * screen, so closing the app mid-set loses nothing and there is no half-saved state to reconcile.
 * Changes are written one after another, in the order they were made: a slow write can never land
 * after a newer one and put an older value back on screen.
 */
export function useActiveWorkoutViewModel() {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const { data: workout, isPending } = useActiveWorkout(owner);
  const exerciseIds = useMemo(
    () => workout?.exercises.map((exercise) => exercise.exerciseId) ?? [],
    [workout],
  );
  const { data: previous } = usePreviousSets(owner, exerciseIds);
  const cacheWorkout = useSetActiveWorkout(owner);
  const queryClient = useQueryClient();
  const rest = useRest(workout?.id);
  const { start: startRest, stop: stopRest } = rest;
  const [finishing, setFinishing] = useState(false);
  // A workout that ends while this screen is open should leave, but only once.
  const leaving = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const report = useCallback((what: string, cause: unknown) => {
    console.error(`[workouts] ${what} (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
    showInfo({ title: "Couldn't save", sub: 'Try again.' });
  }, []);

  /** Queues a change behind every earlier one, then shows whatever the repository hands back. */
  const change = useCallback(
    (what: string, run: () => Promise<Workout>) => {
      writes.current = writes.current.then(async () => {
        try {
          cacheWorkout(await run());
        } catch (cause) {
          report(what, cause);
        }
      });
    },
    [cacheWorkout, report],
  );

  /**
   * Ticking rests for as long as the set's exercise asks. The workout is read from the cache rather than
   * closed over, so this stays the same function and the set rows are not redrawn on every change.
   */
  const onTickSet = useCallback(
    (setId: string, done: boolean) => {
      haptics.selection();
      if (done) {
        const current = queryClient.getQueryData<Workout | null>(workoutKeys.active(owner));
        const exercise = current?.exercises.find((one) => one.sets.some((set) => set.id === setId));
        startRest(exercise?.restSeconds ?? REST_SECONDS.default);
      } else {
        stopRest();
      }
      change('Could not tick a set', () => workouts.setStatus(setId, done ? 'done' : 'pending'));
    },
    [change, owner, queryClient, startRest, stopRest, workouts],
  );

  const onChangeSet = useCallback(
    (setId: string, patch: SetPatch) =>
      change('Could not save a set', () => workouts.updateSet(setId, patch)),
    [change, workouts],
  );

  /** Each exercise's sets, each beside the set of the same number from last time. */
  const exercises = useMemo(
    () =>
      (workout?.exercises ?? []).map((exercise) => {
        const last = previous?.[exercise.exerciseId] ?? [];
        return {
          ...exercise,
          rows: exercise.sets.map((set, index) => {
            const before = last[index];
            const text = previousText(before, exercise.type, unit);
            return { set, previous: text, previousLabel: before ? `Previous, ${text}` : 'No previous set' };
          }),
        };
      }),
    [previous, unit, workout],
  );

  /** Throws the workout away and leaves. Shared by Discard and by finishing with nothing done. */
  const discard = useCallback(async () => {
    if (!workout) return;
    try {
      await writes.current;
      await workouts.discard(workout.id);
      stopRest();
      cacheWorkout(null);
      leaving.current = true;
      goBack();
    } catch (cause) {
      report('Could not discard', cause);
    }
  }, [cacheWorkout, report, stopRest, workout, workouts]);

  const save = useCallback(async () => {
    if (!workout || finishing) return;
    setFinishing(true);
    try {
      // Every edit typed before Finish is in the workout that is saved.
      await writes.current;
      await workouts.finish(workout.id);
      stopRest();
      cacheWorkout(null);
      // Home lists this workout and lights its day: both were read before it existed.
      void queryClient.invalidateQueries({ queryKey: workoutKeys.history });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.days });
      leaving.current = true;
      haptics.success();
      openWorkoutSaved(workout.id);
    } catch (cause) {
      report('Could not finish', cause);
    } finally {
      setFinishing(false);
    }
  }, [cacheWorkout, finishing, queryClient, report, stopRest, workout, workouts]);

  const { done, unticked } = setCounts(workout);

  /**
   * Finishing is never blocked. With nothing ticked there is nothing to save, so it offers what was
   * probably meant instead; with sets left unticked it says, once, which will not be kept.
   */
  const onFinish = useCallback(() => {
    if (!workout) return;
    if (done === 0) {
      Alert.alert('Nothing completed yet', 'Tick a set to save, or discard.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => void discard() },
      ]);
      return;
    }
    if (unticked === 0) {
      void save();
      return;
    }
    Alert.alert(
      'Finish workout?',
      `${plural(unticked, 'unticked set')} won't be saved. The ${done} you completed already ${done === 1 ? 'is' : 'are'}.`,
      [
        { text: 'Keep training', style: 'cancel' },
        { text: 'Finish', onPress: () => void save() },
      ],
    );
  }, [discard, done, save, unticked, workout]);

  const onDiscard = useCallback(() => {
    if (!workout) return;
    Alert.alert(
      'Discard workout?',
      done > 0 ? `Your ${plural(done, 'completed set')} will be deleted.` : 'Nothing has been logged yet.',
      [
        { text: 'Keep training', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => void discard() },
      ],
    );
  }, [discard, done, workout]);

  // Opened with nothing running (a stale link, or it was finished elsewhere): go back rather than
  // showing an empty screen.
  useEffect(() => {
    if (isPending || workout || leaving.current) return;
    leaving.current = true;
    goBack();
  }, [isPending, workout]);

  const totals = workout ? workoutTotals(workout) : null;

  return {
    loading: isPending,
    workout: workout ?? null,
    exercises,
    unit,
    finishing,
    /** Volume and Sets; Time counts up beside them on its own clock. */
    stats: [
      { label: 'Volume', value: formatVolume(totals?.volumeKg ?? 0, unit) },
      { label: 'Sets', value: String(done) },
    ],
    /** When the rest under way ends, or null with none. */
    restEndsAt: rest.endsAt,
    onRestOver: rest.over,
    onRestLess: () => rest.adjust(-1),
    onRestMore: () => rest.adjust(1),
    onSkipRest: stopRest,
    onTickSet,
    onChangeSet,
    onAddSet: (workoutExerciseId: string) =>
      change('Could not add a set', () => workouts.addSet(workoutExerciseId)),
    onRemoveExercise: (workoutExerciseId: string) =>
      change('Could not remove an exercise', () => workouts.removeExercise(workoutExerciseId)),
    onAddExercise: () => openAddExercise(),
    /** The back chevron puts the workout away; it keeps running, a tap on Resume away. */
    onMinimize: () => goBack(),
    onFinish,
    onDiscard,
  };
}

export type ActiveWorkoutViewModel = ReturnType<typeof useActiveWorkoutViewModel>;
