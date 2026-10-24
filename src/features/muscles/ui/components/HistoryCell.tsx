import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HitTier } from '@/features/muscles/domain/muscleStats';

/** A cell of the history grid: fixed size, never stretched. */
export const CELL_SIZE = 16;
const CORNER = 4;

export interface HistoryCellProps {
  tier: HitTier;
  /** This week's cells are outlined. */
  current?: boolean;
  size?: number;
}

/**
 * One muscle in one week: solid when hit twice, half filled from the bottom when hit once, empty when not hit.
 * Each look differs in shape as well as in colour. A plain view, so the grid costs twenty small views and
 * no animation.
 */
export const HistoryCell = memo(function HistoryCell({
  tier,
  current = false,
  size = CELL_SIZE,
}: HistoryCellProps) {
  return <View style={styles.cell(tier, current, size)}>{tier === 1 && <View style={styles.half} />}</View>;
});

const styles = StyleSheet.create((theme) => ({
  cell: (tier: HitTier, current: boolean, size: number) => ({
    width: size,
    height: size,
    borderRadius: CORNER,
    backgroundColor: tier === 2 ? theme.colors.muscleTwice : theme.colors.muscleNone,
    borderWidth: tier === 2 ? 0 : 1,
    borderColor: theme.colors.border,
    ...(current
      ? {
          outlineWidth: 1.5,
          outlineStyle: 'solid' as const,
          outlineColor: theme.colors.text,
          outlineOffset: 1,
        }
      : null),
  }),
  // The bottom half of a muscle hit once, inside the cell's one-point border and its rounded corners.
  half: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: CORNER - 1,
    borderBottomRightRadius: CORNER - 1,
    backgroundColor: theme.colors.muscleOnce,
  },
}));
