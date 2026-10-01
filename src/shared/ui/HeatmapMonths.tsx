import { memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import type { YearMonth } from '@/shared/lib/date/calendar';
import { motion } from '@/theme';

import { HeatCell } from './HeatCell';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface HeatmapMonth {
  key: string;
  /** "Sep"; shown over the month's first week. */
  label: string;
  grid: HeatGrid;
  /** Which month this is (passed back when it's chosen). */
  value: YearMonth;
  /** Read by screen readers for the month: "September 2026, 12 check-ins". */
  accessibilityLabel?: string;
}

export interface HeatmapMonthsProps {
  months: readonly HeatmapMonth[];
  /** Seven row letters, in the person's week order. */
  dayLabels: readonly string[];
  /**
   * Choosing a month: the whole month (its name and every week of it) is one comfortable target, so no one
   * has to aim at a single day. Months that haven't started yet don't answer.
   */
  onMonthPress?: (month: HeatmapMonth) => void;
  /** Horizontal space around the heatmap on screen (gutters + card padding), to size the cells. */
  inset?: number;
  gap?: number;
  monthGap?: number;
  /** The largest a cell may grow on a wide screen. */
  maxCell?: number;
  /** The day that was just checked in (its cell pulses once). */
  pulseDay?: string | null;
}

const LABEL_WIDTH = 10;
const LABEL_GAP = 8;
const MONTH_LABEL = 14;
const MONTH_LABEL_GAP = 6;

/**
 * Months side by side, weeks as columns (the prototype's monthsHM): Home's last three months and each
 * quarter of the year view. Cells are sized to fill the width they're given, so a quarter always fits
 * without scrolling sideways.
 *
 * The heatmap is an overview and a way into a month, not a grid of tiny buttons: each month is one
 * target (a gentle press on the whole month), and the exact day is then chosen on the date wheel. Cells
 * are plain, memoised views, so a new check-in re-renders only the day it changed.
 */
export const HeatmapMonths = memo(function HeatmapMonths({
  months,
  dayLabels,
  onMonthPress,
  inset = 64,
  gap = 3,
  monthGap = 8,
  maxCell = 16,
  pulseDay,
}: HeatmapMonthsProps) {
  const { width } = useWindowDimensions();
  const columns = months.reduce((sum, month) => sum + month.grid.columns.length, 0);
  const free =
    width -
    inset -
    LABEL_WIDTH -
    LABEL_GAP -
    monthGap * (months.length - 1) -
    gap * (columns - months.length);
  const cell = Math.max(8, Math.min(maxCell, Math.floor(free / Math.max(1, columns))));
  const radius = Math.max(2, Math.round(cell / 3.5));

  return (
    <View style={styles.row(monthGap)}>
      <View style={styles.dayLabels(gap)} accessible={false} importantForAccessibility="no-hide-descendants">
        {dayLabels.map((letter, row) => (
          <Text key={row} variant="mini" tone="tertiary" style={styles.dayLabel(cell)}>
            {cell >= 12 || row % 2 === 0 ? letter : ''}
          </Text>
        ))}
      </View>
      {months.map((month) => (
        <MonthGrid
          key={month.key}
          month={month}
          cell={cell}
          gap={gap}
          radius={radius}
          onMonthPress={onMonthPress}
          pulseDay={pulseDay}
        />
      ))}
    </View>
  );
});

/** A month with at least one day that has happened can be opened. */
const hasStarted = (month: HeatmapMonth) => month.grid.columns.some((week) => week.some((day) => day.label));

interface MonthGridProps {
  month: HeatmapMonth;
  cell: number;
  gap: number;
  radius: number;
  onMonthPress?: (month: HeatmapMonth) => void;
  pulseDay?: string | null;
}

const MonthGrid = memo(function MonthGrid({
  month,
  cell,
  gap,
  radius,
  onMonthPress,
  pulseDay,
}: MonthGridProps) {
  const grid = (
    <>
      <Text variant="mini" tone="tertiary" style={styles.monthLabel}>
        {month.label}
      </Text>
      <View style={styles.row(gap)}>
        {month.grid.columns.map((column, columnIndex) => (
          <View key={columnIndex} style={styles.column(gap)}>
            {column.map((day) => (
              <HeatCell
                key={day.key === pulseDay ? `${day.key}-pulse` : day.key}
                level={day.level}
                state={day.state}
                size={cell}
                radius={radius}
                pulse={day.key === pulseDay}
              />
            ))}
          </View>
        ))}
      </View>
    </>
  );

  if (!onMonthPress || !hasStarted(month)) {
    return (
      <View style={styles.month} accessible={false} importantForAccessibility="no-hide-descendants">
        {grid}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={() => onMonthPress(month)}
      scaleTo={motion.press.subtleScale}
      // A little room around the month, so a press just outside its first or last week still counts.
      hitSlop={{ top: 8, bottom: 8, left: gap, right: gap }}
      accessibilityRole="button"
      accessibilityLabel={month.accessibilityLabel ?? month.label}
      accessibilityHint="Opens the month's days"
      style={styles.month}
      testID={`month-${month.key}`}
    >
      {grid}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: (gap: number) => ({ flexDirection: 'row' as const, gap }),
  column: (gap: number) => ({ gap }),
  month: { gap: MONTH_LABEL_GAP },
  monthLabel: { height: MONTH_LABEL, lineHeight: MONTH_LABEL },
  dayLabels: (gap: number) => ({
    width: LABEL_WIDTH,
    gap,
    paddingTop: MONTH_LABEL + MONTH_LABEL_GAP,
  }),
  dayLabel: (size: number) => ({ height: size, lineHeight: size, fontSize: Math.min(10, size - 1) }),
});
