import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { LOCAL_READ } from '@/core/query/queryClient';
import type { WorkoutOwner } from '@/features/workouts/data/WorkoutRepository';
import { workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** Where the recorded days in a range are cached, under the days key. */
export const trainingDaysKey = (owner: WorkoutOwner, from: ISODate, to: ISODate) =>
  [...workoutKeys.days, owner, from, to] as const;

/**
 * The recorded days in a range: each one's frozen level and totals. The wave reads its colours from
 * these and never recomputes a level. Local, so it never waits on a network.
 */
export function useTrainingDays(owner: WorkoutOwner, from: ISODate, to: ISODate, enabled = true) {
  const { workoutDays } = useRepositories();
  return useQuery({
    ...LOCAL_READ,
    queryKey: trainingDaysKey(owner, from, to),
    queryFn: () => workoutDays.list(owner, from, to),
    enabled,
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
