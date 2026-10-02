import { useCallback, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { openActiveWorkout, openExerciseLibrary } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import {
  useActiveWorkout,
  useRoutines,
  useSetActiveWorkout,
  useWorkoutOwner,
} from '../hooks/useWorkoutQueries';

/**
 * The Workout tab: pick up where you left off, start from nothing, or start from a routine.
 * Starting is the one thing here that writes, so it is the only thing that can fail.
 */
export function useWorkoutViewModel() {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const today = useToday();
  const bodyweightKg = useTrainingPreferencesStore((state) => state.bodyweightKg);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  const routines = useRoutines(owner);
  const active = useActiveWorkout(owner);
  const cacheWorkout = useSetActiveWorkout(owner);
  const library = useExerciseList(owner);
  const [starting, setStarting] = useState(false);

  const inProgress = active.data ?? null;

  const start = useCallback(
    async (routineId?: string) => {
      // Something is already running: take them to it rather than starting a second one.
      if (inProgress) {
        openActiveWorkout();
        return;
      }
      if (starting) return;
      setStarting(true);
      try {
        const workout = await workouts.start(owner, { date: today, bodyweightKg, restSeconds, routineId });
        cacheWorkout(workout);
        haptics.success();
        openActiveWorkout();
      } catch (cause) {
        console.error(`[workouts] Could not start (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
        showInfo({ title: "Couldn't start", sub: 'Try again.' });
      } finally {
        setStarting(false);
      }
    },
    [bodyweightKg, cacheWorkout, inProgress, owner, restSeconds, starting, today, workouts],
  );

  return {
    loading: routines.isPending || active.isPending,
    starting,
    /** The workout in progress, if there is one: the tab leads with it. */
    inProgress,
    routines: routines.data ?? [],
    onResume: () => openActiveWorkout(),
    onStartEmpty: () => void start(),
    onStartRoutine: (routineId: string) => void start(routineId),
    /** "104 exercises · by name, muscle or equipment": the library, a tap away. */
    libraryLine: library.data
      ? `${library.data.length} exercises · by name, muscle or equipment`
      : 'By name, muscle or equipment',
    onOpenLibrary: () => openExerciseLibrary(),
  };
}

export type WorkoutViewModel = ReturnType<typeof useWorkoutViewModel>;
