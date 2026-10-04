import { useMutation } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import type { ISODate } from '@/shared/lib/date/isoDate';

import type { BodyweightOwner } from '../data/BodyweightRepository';

/** Records a weigh-in for the owner. Local, so it does not wait for a connection. */
export function useLogBodyweight(owner: BodyweightOwner) {
  const { bodyweight } = useRepositories();
  return useMutation({
    mutationFn: ({ date, weightKg }: { date: ISODate; weightKg: number }) =>
      bodyweight.log(owner, date, weightKg),
    networkMode: 'always',
  });
}
