import { goBack, openExercise } from '@/shared/actions';

import { useExerciseBrowser } from './useExerciseBrowser';

/** The exercise library on its own: browse, and open any exercise for its records and history. */
export function useExerciseLibraryViewModel() {
  const browser = useExerciseBrowser();
  return {
    browser,
    onOpen: (exerciseId: string) => openExercise(exerciseId),
    onBack: () => goBack(),
  };
}

export type ExerciseLibraryViewModel = ReturnType<typeof useExerciseLibraryViewModel>;
