import { useMemo } from 'react';

import { muscleWindow } from '@/features/muscles/domain/muscleCards';
import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';

import { useMuscleSets } from './useMuscleSets';

export type MuscleStatus = 'loading' | 'error' | 'ready';

const NO_ROWS: readonly MuscleSetRow[] = [];

export interface MuscleWindow {
  today: ISODate;
  rows: readonly MuscleSetRow[];
  status: MuscleStatus;
}

/**
 * The one read the three muscle cards share: the last 8 weeks of completed sets, up to today. Home's map
 * and Profile's history and balance all ask for this range, so they hit one cached query, not three. A
 * failed refresh keeps showing the last rows read; only a card that never got any says it could not load.
 */
export function useMuscleWindow(): MuscleWindow {
  const today = useToday();
  const { from, to } = useMemo(() => muscleWindow(today), [today]);
  const query = useMuscleSets(from, to);
  const status: MuscleStatus = query.data ? 'ready' : query.isError ? 'error' : 'loading';
  return { today, rows: query.data ?? NO_ROWS, status };
}
