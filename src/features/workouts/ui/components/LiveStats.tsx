import { useCallback } from 'react';

import { formatDuration } from '@/shared/lib/format/formatDuration';

import { useClockValue } from '../useClockValue';
import { StatsRow, type Stat } from './StatsRow';

export interface LiveStatsProps {
  /** When the workout started (ISO): Time counts up from it. */
  startedAt: string;
  /** The rest of the numbers (Volume, Sets), after Time. */
  stats: readonly Stat[];
  testID?: string;
}

/**
 * The workout in progress's numbers, with Time counting up. The clock lives here, so it redraws this row
 * once a second and nothing else on the screen.
 */
export function LiveStats({ startedAt, stats, testID }: LiveStatsProps) {
  const start = new Date(startedAt).getTime();
  const elapsed = useClockValue(useCallback((now: number) => Math.floor((now - start) / 1000), [start]));
  return <StatsRow stats={[{ label: 'Time', value: formatDuration(elapsed) }, ...stats]} testID={testID} />;
}
