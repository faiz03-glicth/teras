import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { useWorkoutOwner, workoutKeys } from '@/features/workouts/hooks/useWorkoutQueries';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The finished workouts' exercises dated `from`..`to`, with their muscles and completed sets: one read
 * for a muscle card. Keyed under the workout history, so saving, editing or deleting a workout (which
 * refreshes the history) refreshes the card too; it is never recomputed per frame.
 */
export function useMuscleSets(from: ISODate, to: ISODate, enabled = true) {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'muscles', from, to],
    queryFn: () => workouts.muscleSets(owner, from, to),
    enabled,
    networkMode: 'always',
  });
}
