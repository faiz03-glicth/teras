import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import type { WorkoutOwner } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

export const streakKeys = {
  /** A prefix: a pull that changed anything refreshes every range beneath it. */
  days: ['streak', 'days'] as const,
};

/** The days checked in on Streak in a range, from the phone's copy, so it never waits on a network. */
export function useStreakDays(owner: WorkoutOwner, from: ISODate, to: ISODate, enabled = true) {
  const { streakDays } = useRepositories();
  return useQuery({
    queryKey: [...streakKeys.days, owner, from, to],
    queryFn: () => streakDays.list(owner, from, to),
    enabled,
    networkMode: 'always',
  });
}
