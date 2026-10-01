import { memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';

import { Heatmap } from './Heatmap';
import { Text } from './Text';

export interface HeatmapWeeksProps {
  grid: HeatGrid;
  /** One per week: a month name over the week it starts in, '' elsewhere. */
  monthLabels: readonly string[];
  dayLabels: readonly string[];
  /** Horizontal space around it on screen (gutters + card padding), to size the cells. */
  inset?: number;
  gap?: number;
  maxCell?: number;
  /** Read by screen readers in place of the cells ("Last 20 weeks: 64 active days"). */
  accessibilityLabel: string;
}

const LABEL_WIDTH = 10;
const LABEL_GAP = 6;
const MONTH_ROW = 12;

/**
 * The last N weeks as one continuous heatmap with month names over it (Profile's "Last 20 weeks", the
 * Appearance preview). A summary, so it's one element for screen readers; the days themselves open from
 * Home and the full heatmap.
 */
export const HeatmapWeeks = memo(function HeatmapWeeks({
  grid,
  monthLabels,
  dayLabels,
  inset = 64,
  gap = 3,
  maxCell = 14,
  accessibilityLabel,
}: HeatmapWeeksProps) {
  const { width } = useWindowDimensions();
  const weeks = grid.columns.length;
  const free = width - inset - LABEL_WIDTH - LABEL_GAP - gap * (weeks - 1);
  const cell = Math.max(6, Math.min(maxCell, Math.floor(free / Math.max(1, weeks))));

  return (
    <View style={styles.root} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.months}>
        {monthLabels.map((label, i) =>
          label ? (
            <Text key={i} variant="mini" tone="tertiary" style={styles.month(i * (cell + gap))}>
              {label}
            </Text>
          ) : null,
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.dayLabels(gap)}>
          {dayLabels.map((letter, row) => (
            <Text key={row} variant="mini" tone="tertiary" style={styles.dayLabel(cell)}>
              {row % 2 === 0 ? letter : ''}
            </Text>
          ))}
        </View>
        <Heatmap grid={grid} cellSize={cell} gap={gap} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 4 },
  months: { height: MONTH_ROW, marginLeft: LABEL_WIDTH + LABEL_GAP },
  // Placed over its week and free to spill over the following (unlabelled) weeks.
  month: (left: number) => ({ position: 'absolute' as const, left, fontSize: 10, lineHeight: MONTH_ROW }),
  body: { flexDirection: 'row', gap: LABEL_GAP },
  dayLabels: (gap: number) => ({ width: LABEL_WIDTH, gap }),
  dayLabel: (size: number) => ({ height: size, lineHeight: size, fontSize: Math.min(10, size - 1) }),
});
