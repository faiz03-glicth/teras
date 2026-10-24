import { useMemo } from 'react';

import {
  EMPTY_HISTORY,
  HISTORY_WEEKS,
  muscleHistory,
  type HistoryRow,
} from '@/features/muscles/domain/muscleCards';
import { useMuscleWindow, type MuscleStatus } from '@/features/muscles/hooks/useMuscleWindow';

/** The ten muscles are listed in two columns, five to a column. */
const COLUMN_ROWS = 5;

export interface MuscleHistoryModel {
  status: MuscleStatus;
  /** Two columns of muscles: each row has last week's and this week's cell. */
  columns: readonly [readonly HistoryRow[], readonly HistoryRow[]];
  /** Of the last two weeks, how many had every muscle twice. */
  weeksTwice: number;
  weeksShown: number;
  /** One dot per week, last week first: filled when that week had every muscle twice. */
  goal: readonly boolean[];
  /** A quiet line when the history could not be read. */
  note: string | null;
  accessibilityLabel: string;
}

/**
 * Profile's "Muscle history": last week and this week, a muscle per row. A muscle still short of two hits this
 * week is flagged with a bullet. While loading, every cell shows "not hit" and the card keeps its height.
 */
export function useMuscleHistory(): MuscleHistoryModel {
  const { today, rows, status } = useMuscleWindow();
  const history = useMemo(
    () => (status === 'ready' ? muscleHistory(rows, today) : EMPTY_HISTORY),
    [status, rows, today],
  );
  const columns = useMemo(
    () => [history.rows.slice(0, COLUMN_ROWS), history.rows.slice(COLUMN_ROWS)] as const,
    [history.rows],
  );

  return {
    status,
    columns,
    weeksTwice: history.weeksTwice,
    weeksShown: HISTORY_WEEKS,
    goal: history.goal,
    note: status === 'error' ? "Couldn't load your muscle history" : null,
    accessibilityLabel:
      status === 'ready'
        ? history.accessibilityLabel
        : `Muscle history, ${status === 'loading' ? 'loading' : 'could not be loaded'}.`,
  };
}
