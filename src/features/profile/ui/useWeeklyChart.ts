import { useCallback, useMemo, useState } from 'react';

import { formatVolume, LB_PER_KG } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { weeklyRange, weeklyTotals, type WeekTotals } from '@/features/workouts/domain/weekly';
import { useWorkoutOwner, useWorkoutsBetween } from '@/features/workouts/hooks/useWorkoutQueries';
import { useToday } from '@/shared/lib/date/useToday';
import { shortDate } from '@/shared/lib/format/dates';

/** About a quarter, as in the prototype. */
export const CHART_WEEKS = 12;
/** Weeks start on Monday, as the Saved screen's week and Exercise detail's weeks do. */
const WEEK_START = 'mon' as const;

export type ChartMeasure = 'duration' | 'volume' | 'reps';

export const MEASURE_OPTIONS = [
  { value: 'duration', label: 'Duration' },
  { value: 'volume', label: 'Volume' },
  { value: 'reps', label: 'Reps' },
] as const satisfies readonly { value: ChartMeasure; label: string }[];

const thousands = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Profile's chart: the last twelve weeks of finished workouts, by duration, volume or reps, this week
 * last and highlighted. Read from the phone like the rest of the training history, so it works offline
 * and as a guest; finishing a workout refreshes it with the rest of the history.
 */
export function useWeeklyChart() {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const [measure, setMeasure] = useState<ChartMeasure>('volume');
  const { from, to } = weeklyRange(today, CHART_WEEKS, WEEK_START);
  const query = useWorkoutsBetween(owner, from, to);

  const weeks = useMemo(
    () => weeklyTotals(query.data ?? [], today, CHART_WEEKS, WEEK_START),
    [query.data, today],
  );

  const valueOf = useCallback(
    (week: WeekTotals) =>
      measure === 'duration'
        ? Math.round(week.seconds / 60)
        : measure === 'reps'
          ? week.reps
          : unit === 'kg'
            ? week.volumeKg
            : week.volumeKg * LB_PER_KG,
    [measure, unit],
  );
  const textOf = (week: WeekTotals) =>
    measure === 'duration'
      ? `${thousands(week.seconds / 60)} min`
      : measure === 'reps'
        ? `${thousands(week.reps)} reps`
        : formatVolume(week.volumeKg, unit);

  const current = weeks.at(-1);
  const first = weeks[0];
  const thisWeek = current ? textOf(current) : '';
  const { refetch } = query;

  return {
    status: query.isError ? ('error' as const) : query.isPending ? ('loading' as const) : ('ready' as const),
    measure,
    measureOptions: MEASURE_OPTIONS,
    thisWeek,
    values: weeks.map(valueOf),
    // The first and this week, under the bars at either end, as Exercise detail's chart has them.
    labels: first && current ? [shortDate(first.week, today), shortDate(current.week, today)] : [],
    accessibilityLabel: `Weekly ${measure}, last ${CHART_WEEKS} weeks, ${thisWeek} this week`,
    onMeasureChange: setMeasure,
    onRetry: () => void refetch(),
  };
}

export type WeeklyChart = ReturnType<typeof useWeeklyChart>;
