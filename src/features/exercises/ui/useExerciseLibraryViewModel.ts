import { goBack, openExercise } from '@/shared/actions';

import { useExerciseBrowser } from './useExerciseBrowser';

// Module-level, so it is the same function every render and the list's memoised rows can skip.
const openExerciseById = (exerciseId: string) => openExercise(exerciseId);

/** The exercise library on its own: browse, and open any exercise for its records and history. */
export function useExerciseLibraryViewModel() {
  const browser = useExerciseBrowser();
  return {
    browser,
    onOpen: openExerciseById,
    onBack: () => goBack(),
  };
}

export type ExerciseLibraryViewModel = ReturnType<typeof useExerciseLibraryViewModel>;
