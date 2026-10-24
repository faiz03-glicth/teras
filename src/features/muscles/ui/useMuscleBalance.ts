import { useMemo } from 'react';

import { muscleBalance, type BalanceTile } from '@/features/muscles/domain/muscleCards';
import { useMuscleWindow, type MuscleStatus } from '@/features/muscles/hooks/useMuscleWindow';

export interface MuscleBalanceModel {
  status: MuscleStatus;
  /** Nothing completed in the last 8 weeks (once loaded): the card says so instead of drawing a web. */
  empty: boolean;
  /** Polygon `points` of the last 4 weeks and the 4 before; empty until there is something to draw. */
  now: string;
  before: string;
  /** "Biggest gain" and "Needs work". Placeholders while loading, so the card keeps its height. */
  tiles: readonly BalanceTile[];
  /** A quiet line in place of the web's numbers when the balance could not be read. */
  note: string | null;
  accessibilityLabel: string;
}

const LOADING_TILES: readonly BalanceTile[] = [
  { label: 'Biggest gain', name: '–', sub: ' ', tone: 'secondary' },
  { label: 'Needs work', name: '–', sub: ' ', tone: 'secondary' },
];

/**
 * Profile's "Muscle balance": the web of sets per muscle over the last 4 weeks against the 4 before it. The
 * shapes are worked out once per change of the data, not per frame.
 */
export function useMuscleBalance(): MuscleBalanceModel {
  const { today, rows, status } = useMuscleWindow();
  const balance = useMemo(
    () => (status === 'ready' ? muscleBalance(rows, today) : null),
    [status, rows, today],
  );

  return {
    status,
    empty: balance?.empty ?? false,
    now: balance?.now ?? '',
    before: balance?.before ?? '',
    tiles: balance && !balance.empty ? balance.tiles : status === 'loading' ? LOADING_TILES : [],
    note: status === 'error' ? "Couldn't load your muscle balance" : null,
    accessibilityLabel: balance
      ? balance.accessibilityLabel
      : `Muscle balance, ${status === 'loading' ? 'loading' : 'could not be loaded'}.`,
  };
}
