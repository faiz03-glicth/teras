import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';

import type { RoutineOwner } from '../data/RoutineRepository';
import type { RoutineDraft } from '../domain/draft';

/** Under the Workout tab's routines key, so one invalidation refreshes the list and the routine. */
const routineKey = (owner: RoutineOwner, id: string | null) =>
  [...workoutKeys.routines(owner), 'one', id] as const;

/** One routine as the editor opens it, or null when it is gone. */
export function useRoutine(owner: RoutineOwner, id: string | null) {
  const { routines } = useRepositories();
  return useQuery({
    queryKey: routineKey(owner, id),
    queryFn: () => (id ? routines.get(owner, id) : null),
    enabled: id !== null,
    networkMode: 'always',
  });
}

/**
 * Saves a routine. A refusal (no name) comes back as the result, not an error. Resolves once the
 * Workout tab's list has been read again, so it shows the change the moment the editor closes.
 */
export function useSaveRoutine(owner: RoutineOwner) {
  const { routines } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: RoutineDraft) => routines.save(owner, draft),
    onSuccess: (result) =>
      result.ok ? queryClient.invalidateQueries({ queryKey: workoutKeys.routines(owner) }) : undefined,
    networkMode: 'always',
  });
}

/** Deletes a routine; resolves once the list no longer shows it. */
export function useRemoveRoutine(owner: RoutineOwner) {
  const { routines } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routines.remove(owner, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.routines(owner) }),
    networkMode: 'always',
  });
}
