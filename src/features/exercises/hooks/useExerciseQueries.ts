import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import type { ExerciseOwner } from '@/features/exercises/data/ExerciseRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';

/** How many recently done exercises lead the browser, as in the prototype. */
const RECENT_COUNT = 5;

export const exerciseKeys = {
  library: (owner: ExerciseOwner) => ['exercises', owner, 'library'] as const,
  favourites: (owner: ExerciseOwner) => ['exercises', owner, 'favourites'] as const,
  one: (id: string | null) => ['exercises', 'one', id] as const,
};

/** Every exercise this person can pick: the built-in library and their own. */
export function useExerciseList(owner: ExerciseOwner) {
  const { exercises } = useRepositories();
  return useQuery({
    queryKey: exerciseKeys.library(owner),
    queryFn: () => exercises.list(owner),
    networkMode: 'always',
  });
}

/** The ids of their favourite exercises. */
export function useFavouriteIds(owner: ExerciseOwner) {
  const { exercises } = useRepositories();
  return useQuery({
    queryKey: exerciseKeys.favourites(owner),
    queryFn: () => exercises.favourites(owner),
    networkMode: 'always',
  });
}

/** The exercises done most recently. Under the history key, so finishing a workout refreshes it. */
export function useRecentExercises(owner: ExerciseOwner) {
  const { exercises } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'recent-exercises'],
    queryFn: () => exercises.recent(owner, RECENT_COUNT),
    networkMode: 'always',
  });
}

/** One exercise, by id. */
export function useExercise(id: string | null) {
  const { exercises } = useRepositories();
  return useQuery({
    queryKey: exerciseKeys.one(id),
    queryFn: () => (id ? exercises.get(id) : null),
    enabled: id !== null,
    networkMode: 'always',
  });
}

/** Every finished workout an exercise was done in, the latest first. Refreshed by finishing a workout. */
export function useExerciseHistory(owner: ExerciseOwner, id: string | null) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'exercise', id],
    queryFn: () => (id ? workouts.exerciseHistory(owner, id) : []),
    enabled: id !== null,
    networkMode: 'always',
  });
}

/**
 * Favourites one exercise, or takes it back. The heart changes at once (the cached list is updated
 * before the write) and goes back if the write fails.
 */
export function useSetFavourite(owner: ExerciseOwner) {
  const { exercises } = useRepositories();
  const queryClient = useQueryClient();
  const key = exerciseKeys.favourites(owner);
  return useMutation({
    mutationFn: ({ exerciseId, favourite }: { exerciseId: string; favourite: boolean }) =>
      exercises.setFavourite(owner, exerciseId, favourite),
    onMutate: async ({ exerciseId, favourite }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        favourite
          ? [...ids.filter((id) => id !== exerciseId), exerciseId]
          : ids.filter((id) => id !== exerciseId),
      );
      return { before };
    },
    onError: (_cause, _change, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
    networkMode: 'always',
  });
}
