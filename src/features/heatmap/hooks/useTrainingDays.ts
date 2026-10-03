import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import type { WorkoutOwner } from '@/features/workouts/data/WorkoutRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The recorded days in a range: each one's frozen level and totals. The wave reads its colours from
 * these and never recomputes a level. Local, so it never waits on a network.
 */
export function useTrainingDays(owner: WorkoutOwner, from: ISODate, to: ISODate, enabled = true) {
  const { workoutDays } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.days, owner, from, to],
    queryFn: () => workoutDays.list(owner, from, to),
    enabled,
    networkMode: 'always',
  });
}

/** The volumes of the training days in the 90 days before `day`: what that day was judged against. */
export function useDayWindow(owner: WorkoutOwner, day: ISODate) {
  const { workoutDays } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.days, owner, 'window', day],
    queryFn: () => workoutDays.windowBefore(owner, day),
    networkMode: 'always',
  });
}
