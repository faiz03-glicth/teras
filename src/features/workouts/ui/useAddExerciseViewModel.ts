import { useCallback, useRef } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useExerciseBrowser } from '@/features/exercises/ui/useExerciseBrowser';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goBack, openExercise } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { useActiveWorkout, useSetActiveWorkout, useWorkoutOwner } from '../hooks/useWorkoutQueries';

/** The exercise browser, and adding the exercise picked to the workout in progress. */
export function useAddExerciseViewModel() {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const browser = useExerciseBrowser();
  const { data: workout } = useActiveWorkout(owner);
  const cacheWorkout = useSetActiveWorkout(owner);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  // A second tap while the first is being added would add the exercise twice.
  const adding = useRef(false);

  const onPick = useCallback(
    async (exerciseId: string) => {
      if (!workout || adding.current) return;
      adding.current = true;
      try {
        cacheWorkout(await workouts.addExercise(workout.id, exerciseId, restSeconds));
        haptics.success();
        goBack();
      } catch (cause) {
        console.error(
          `[workouts] Could not add an exercise (${cause instanceof Error ? cause.name : 'unknown'})`,
        ); // TODO(Sentry)
        showInfo({ title: "Couldn't add exercise", sub: 'Try again.' });
      } finally {
        adding.current = false;
      }
    },
    [cacheWorkout, restSeconds, workout, workouts],
  );

  return {
    browser,
    onPick: (exerciseId: string) => void onPick(exerciseId),
    onInfo: (exerciseId: string) => openExercise(exerciseId),
    onBack: () => goBack(),
  };
}

export type AddExerciseViewModel = ReturnType<typeof useAddExerciseViewModel>;
