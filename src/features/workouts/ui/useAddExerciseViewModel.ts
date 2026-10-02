import { useCallback, useRef } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { useExerciseBrowser } from '@/features/exercises/ui/useExerciseBrowser';
import { useRoutineDraftStore } from '@/features/routines/state/routineDraftStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goBack, openExercise, type AddExerciseTarget } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { useActiveWorkoutSummary, useSetActiveWorkout, useWorkoutOwner } from '../hooks/useWorkoutQueries';

/**
 * The exercise browser, and adding the exercise picked to the workout in progress, or to the routine
 * being edited. A routine keeps it in its draft: nothing is written until the routine is saved.
 */
export function useAddExerciseViewModel(target: AddExerciseTarget = 'workout') {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const browser = useExerciseBrowser();
  const library = useExerciseList(owner);
  const { data: workout } = useActiveWorkoutSummary(owner);
  const cacheWorkout = useSetActiveWorkout(owner);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  const addToRoutine = useRoutineDraftStore((state) => state.add);
  // A second tap while the first is being added would add the exercise twice.
  const adding = useRef(false);

  const pickForRoutine = useCallback(
    (exerciseId: string) => {
      const exercise = library.data?.find((row) => row.id === exerciseId);
      if (!exercise) return;
      addToRoutine(exercise.id, exercise.type);
      haptics.selection();
      goBack();
    },
    [addToRoutine, library.data],
  );

  const addToWorkout = useCallback(
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
    onPick: (exerciseId: string) =>
      target === 'routine' ? pickForRoutine(exerciseId) : void addToWorkout(exerciseId),
    onInfo: (exerciseId: string) => openExercise(exerciseId),
    onBack: () => goBack(),
  };
}

export type AddExerciseViewModel = ReturnType<typeof useAddExerciseViewModel>;
