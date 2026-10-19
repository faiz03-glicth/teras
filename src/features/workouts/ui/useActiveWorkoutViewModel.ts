import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '@/core/DiProvider';
import { formatVolume, REST_SECONDS } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { pushDaysNow } from '@/features/workoutDays/data/pushDaysNow';
import { goBack, openAddExercise, openWorkoutSaved, useLeaveGuard, useScreenSettled } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { shortDay } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { useStagedReveal } from '@/shared/lib/useStagedReveal';
import { showInfo } from '@/shared/ui/toast';

import type { RemovedSet, SetPatch, Workout } from '../data/WorkoutRepository';
import { previousText } from '../domain/setUnits';
import { NothingToTickError } from '../domain/tickFill';
import { workoutTotals } from '../domain/totals';
import {
  useActiveWorkout,
  usePreviousSets,
  useSetActiveWorkout,
  useWorkoutOwner,
  workoutKeys,
} from '../hooks/useWorkoutQueries';
import { useRestTimerStore } from '../state/restTimerStore';

/**
 * Exercises drawn while the workout slides up: more than a phone shows below its numbers. The rest follow
 * one a frame once it has settled, so no frame blurs a whole routine's wells.
 */
export const FIRST_EXERCISES = 3;

/** How long a deleted set can be brought back. */
export const UNDO_MS = 5000;

/** A set just deleted, which the Undo bar can still bring back. */
interface Undoable {
  /** Keys the bar, so a second delete replaces the first one's. */
  id: string;
  /** "Set 2 deleted". */
  label: string;
  removed: RemovedSet;
}

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
  const { workouts, workoutDays } = useRepositories();
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
  /** Each set's typed values whose write is queued but not yet started. */
  const typed = useRef(new Map<string, SetPatch>());
  /** Sets deleted on this screen (until an Undo): a keystroke landing as one slides away has nothing to write to. */
  const removedSets = useRef(new Set<string>());

  const report = useCallback((what: string, cause: unknown) => {
    console.error(`[workouts] ${what} (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
    showInfo({ title: "Couldn't save", sub: 'Try again.' });
  }, []);

  /** Queues a change behind every earlier one, then shows whatever the repository hands back (if anything). */
  const change = useCallback(
    (what: string, run: () => Promise<Workout | null>) => {
      writes.current = writes.current.then(async () => {
        try {
          const after = await run();
          if (after) cacheWorkout(after);
        } catch (cause) {
          report(what, cause);
        }
      });
    },
    [cacheWorkout, report],
  );

  /**
   * Ticking rests for as long as the set's exercise asks, once the set is stored as done: a tick with nothing
   * typed in and nothing to copy is refused (tickFill), and a refused tick never starts a rest. Read from
   * what the repository hands back, so this stays the same function and the set rows are not redrawn.
   */
  const onTickSet = useCallback(
    (setId: string, done: boolean) => {
      haptics.selection();
      if (!done) stopRest();
      change('Could not tick a set', async () => {
        try {
          const after = await workouts.setStatus(setId, done ? 'done' : 'pending');
          const exercise = after.exercises.find((one) => one.sets.some((set) => set.id === setId));
          // A past day's log is typed in after the fact: there is nothing to rest for.
          if (done && !after.pastLog) startRest(exercise?.restSeconds ?? REST_SECONDS.default);
          return after;
        } catch (cause) {
          if (!(cause instanceof NothingToTickError)) throw cause;
          haptics.warning();
          showInfo({ title: 'Nothing to tick yet', sub: 'Type what you lifted first.' });
          return null;
        }
      });
    },
    [change, startRest, stopRest, workouts],
  );

  /**
   * Typing writes as it goes, but keystrokes that land while a set's write is still waiting its turn join
   * that write instead of queueing their own: a burst of typing is a write or two, not one per key, and
   * the value saved is always the last one typed. Nothing waits on a timer, so nothing typed can be lost.
   */
  const onChangeSet = useCallback(
    (setId: string, patch: SetPatch) => {
      if (removedSets.current.has(setId)) return;
      const waiting = typed.current.get(setId);
      typed.current.set(setId, { ...waiting, ...patch });
      if (waiting) return;
      change('Could not save a set', () => {
        const latest = typed.current.get(setId) ?? patch;
        typed.current.delete(setId);
        return workouts.updateSet(setId, latest);
      });
    },
    [change, workouts],
  );

  const [undoable, setUndoable] = useState<Undoable | null>(null);

  // The Undo bar stays up for UNDO_MS, then the delete is for good.
  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(() => setUndoable(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undoable]);

  /**
   * The set goes at once; the Undo bar (on this screen, above the rest bar while resting) can put it back
   * exactly, in its place, for a few seconds. Both go through the write queue, so a value typed just before
   * the swipe is in the set that comes back.
   */
  const onRemoveSet = useCallback(
    (setId: string) => {
      const current = queryClient.getQueryData<Workout | null>(workoutKeys.active(owner));
      const number = (
        current?.exercises.find((one) => one.sets.some((set) => set.id === setId))?.sets ?? []
      ).findIndex((set) => set.id === setId);
      // A write already waiting still runs first (it is ahead in the queue); nothing typed after this does.
      removedSets.current.add(setId);
      change('Could not delete a set', async () => {
        const { workout: after, removed } = await workouts.removeSet(setId);
        setUndoable({ id: setId, label: number >= 0 ? `Set ${number + 1} deleted` : 'Set deleted', removed });
        return after;
      });
    },
    [change, owner, queryClient, workouts],
  );

  const onUndoRemoveSet = useCallback(() => {
    if (!undoable || leaving.current) return;
    setUndoable(null);
    haptics.light();
    removedSets.current.delete(undoable.id);
    change('Could not bring the set back', () => workouts.restoreSet(undoable.removed));
  }, [change, undoable, workouts]);

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
  // Each field is a texture with a blurred inset well: a whole routine's at once is 300 ms of drawing (S44).
  const settled = useScreenSettled();
  const revealed = useStagedReveal(settled, Math.max(0, exercises.length - FIRST_EXERCISES));
  const shown = useMemo(() => exercises.slice(0, FIRST_EXERCISES + revealed), [exercises, revealed]);

  /** Throws the workout away and leaves. Shared by Discard and by finishing with nothing done. */
  const discard = useCallback(async () => {
    if (!workout) return;
    try {
      await writes.current;
      await workouts.discard(workout.id);
      setUndoable(null);
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
      setUndoable(null);
      stopRest();
      cacheWorkout(null);
      // Home lists this workout and lights its day: both were read before it existed.
      void queryClient.invalidateQueries({ queryKey: workoutKeys.history });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.days });
      // Its routine's card says when it was last done, and how that day stood.
      void queryClient.invalidateQueries({ queryKey: workoutKeys.routines(owner) });
      // The day it lit reaches the server (and Streak) now, not at the next time the app is opened.
      pushDaysNow(workoutDays, owner);
      leaving.current = true;
      haptics.success();
      openWorkoutSaved(workout.id);
    } catch (cause) {
      report('Could not finish', cause);
    } finally {
      setFinishing(false);
    }
  }, [cacheWorkout, finishing, owner, queryClient, report, stopRest, workout, workoutDays, workouts]);

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

  /** Discard is confirmed on the screen itself (the workout options' Keep / Discard), then this runs. */
  const onDiscardNow = useCallback(() => void discard(), [discard]);

  // A past day's log is never left running in the background: leaving it any way asks to save or discard.
  const pastLog = workout?.pastLog === true;
  const today = useToday();
  useLeaveGuard(pastLog, (leave) => {
    // Saving or discarding is already taking it away.
    if (leaving.current || !workout) {
      leave();
      return;
    }
    Alert.alert('Save this log?', `Your workout for ${shortDay(workout.date, today)} isn't saved yet.`, [
      { text: 'Keep logging', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => void discard() },
      { text: 'Save', onPress: onFinish },
    ]);
  });

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
    exercises: shown,
    unit,
    finishing,
    /** Volume and Sets; Time counts up beside them on its own clock. */
    stats: [
      { label: 'Volume', value: formatVolume(totals?.volumeKg ?? 0, unit) },
      { label: 'Sets', value: String(done) },
    ],
    /** Logged after its day: no clock, no rest, and Finish saves it. */
    pastLog,
    /** When the rest under way ends, or null with none (never, for a past day's log). */
    restEndsAt: pastLog ? null : rest.endsAt,
    onRestOver: rest.over,
    onRestLess: () => rest.adjust(-1),
    onRestMore: () => rest.adjust(1),
    onSkipRest: stopRest,
    onTickSet,
    onChangeSet,
    onRemoveSet,
    /** The set just deleted, while it can still be brought back: the Undo bar. */
    undo: undoable ? { key: undoable.id, label: undoable.label } : null,
    onUndoRemoveSet,
    onAddSet: (workoutExerciseId: string) =>
      change('Could not add a set', () => workouts.addSet(workoutExerciseId)),
    onRemoveExercise: (workoutExerciseId: string) =>
      change('Could not remove an exercise', () => workouts.removeExercise(workoutExerciseId)),
    onAddExercise: () => openAddExercise(),
    /** The back chevron puts the workout away; it keeps running, a tap on Resume away. */
    onMinimize: () => goBack(),
    onFinish,
    /** What discarding would lose, for its confirm. */
    discardLine:
      done > 0 ? `Your ${plural(done, 'completed set')} will be deleted.` : 'Nothing has been logged yet.',
    onDiscardNow,
  };
}

export type ActiveWorkoutViewModel = ReturnType<typeof useActiveWorkoutViewModel>;
