import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import { useMotion, type HeatmapRevealStyle } from '@/theme';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface HeatmapProps {
  /** Columns (weeks) of day cells, built by the heatmap domain. */
  grid: HeatGrid;
  cellSize?: number;
  gap?: number;
  radius?: number;
  /** Cells become buttons that report their key (ISO date). */
  interactive?: boolean;
  onDayPress?: (key: string) => void;
  /** Seven pre-formatted row labels (e.g. M, '', W, …). */
  dayLabels?: readonly string[];
  /** Plays the motion system's heatmapReveal once, as the heatmap appears. Skipped with Reduce Motion. */
  animateIn?: boolean;
  /**
   * A motion for every cell, by position (from the motion system), in place of the entrance: e.g. the
   * rebuild's collapse and stacking. Cells keep their identity when it changes (never remounted), so one
   * motion hands over to the next without a gap.
   */
  cellMotion?: ((column: number, row: number) => HeatmapRevealStyle | null) | null;
}

/**
 * Weeks-mode heatmap (columns of up to 7 days). Months mode and month labels arrive with Phase 2.
 * The reveal is a native CSS animation per cell (no per-cell hooks), resolved once here. It moves only
 * opacity and scale, so it needs no theme: a theme change never restarts it, and it looks the same in
 * every theme. Non-interactive heatmaps are decorative and hidden from screen readers.
 */
export const Heatmap = memo(function Heatmap({
  grid,
  cellSize = 14,
  gap = 4,
  radius,
  interactive = false,
  onDayPress,
  dayLabels,
  animateIn = false,
  cellMotion,
}: HeatmapProps) {
  const motion = useMotion();
  const decorative = !interactive;

  return (
    <View
      style={styles.row(gap)}
      accessible={false}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={decorative}
    >
      {dayLabels && (
        <View style={styles.column(gap)}>
          {dayLabels.map((label, row) => (
            <Text key={row} variant="mini" tone="tertiary" style={styles.dayLabel(cellSize)}>
              {label}
            </Text>
          ))}
        </View>
      )}
      {grid.columns.map((column, columnIndex) => (
        <View key={columnIndex} style={styles.column(gap)}>
          {column.map((cell, rowIndex) => (
            <HeatCell
              key={cell.key}
              level={cell.level}
              state={cell.state}
              size={cellSize}
              radius={radius}
              appear={
                cellMotion
                  ? cellMotion(columnIndex, rowIndex)
                  : animateIn
                    ? motion.heatmapReveal(columnIndex, rowIndex)
                    : null
              }
              onPress={interactive && onDayPress ? () => onDayPress(cell.key) : undefined}
              accessibilityLabel={cell.label}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: (gap: number) => ({ flexDirection: 'row' as const, gap }),
  column: (gap: number) => ({ gap }),
  dayLabel: (size: number) => ({ height: size, lineHeight: size, fontSize: Math.min(10, size - 1) }),
});
