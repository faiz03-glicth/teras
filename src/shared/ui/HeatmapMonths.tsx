import { memo } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatCellState, HeatGrid } from '@/features/heatmap/domain/grid';
import type { HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';
import { usePressDelay } from './pressDelay';
import { Text } from './Text';

export interface HeatmapMonth {
  key: string;
  /** "Sep"; shown over the month's first week. */
  label: string;
  grid: HeatGrid;
}

export interface HeatmapMonthsProps {
  months: readonly HeatmapMonth[];
  /** Seven row letters, in the person's week order. */
  dayLabels: readonly string[];
  /** A day was tapped (its ISO date). Days still to come never answer: there is nothing to open. */
  onDayPress?: (day: string) => void;
  /** The day whose detail is open (ISO date), ringed. */
  selected?: string | null;
  /** Horizontal space around the heatmap on screen (gutters + card padding), to size the cells. */
  inset?: number;
  /** Size the cells as if there were this many week columns, so stacked rows share one cell size. */
  columns?: number;
  gap?: number;
  monthGap?: number;
  /** The largest a cell may grow on a wide screen. */
  maxCell?: number;
}

const LABEL_WIDTH = 10;
const LABEL_GAP = 8;
const MONTH_LABEL = 14;
const MONTH_LABEL_GAP = 6;

/**
 * Months side by side, weeks as columns (the prototype's monthsHM): Home's training wave and each row
 * of the Calendar. Cells are sized to fill the width they are given, so a row always fits without
 * scrolling sideways.
 *
 * Every day that has happened opens on a tap. Cells stay flat and still — no shadow, no animation per
 * cell — and are memoised on their own values, so ringing a day re-renders only its month. Each tap
 * target is widened across half the gap on every side, so a tap never falls between two days.
 */
export const HeatmapMonths = memo(function HeatmapMonths({
  months,
  dayLabels,
  onDayPress,
  selected = null,
  inset = 64,
  columns,
  gap = 3,
  monthGap = 10,
  maxCell = 16,
}: HeatmapMonthsProps) {
  const { width } = useWindowDimensions();
  const own = months.reduce((sum, month) => sum + month.grid.columns.length, 0);
  const count = Math.max(own, columns ?? 0);
  const free =
    width - inset - LABEL_WIDTH - LABEL_GAP - monthGap * (months.length - 1) - gap * (count - months.length);
  const cell = Math.max(8, Math.min(maxCell, Math.floor(free / Math.max(1, count))));
  const radius = Math.max(2, Math.round(cell / 3.5));
  const pressDelay = usePressDelay();

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
          // Only the month holding the ringed day hears of it, so a ring re-renders one month, not all.
          selected={selected && monthHolds(month, selected) ? selected : null}
          pressDelay={pressDelay}
          onDayPress={onDayPress}
        />
      ))}
    </View>
  );
});

const monthHolds = (month: HeatmapMonth, day: string) =>
  month.grid.columns.some((column) => column.some((cell) => cell.key === day));

interface MonthGridProps {
  month: HeatmapMonth;
  cell: number;
  gap: number;
  radius: number;
  selected: string | null;
  pressDelay: number;
  onDayPress?: (day: string) => void;
}

const MonthGrid = memo(function MonthGrid({
  month,
  cell,
  gap,
  radius,
  selected,
  pressDelay,
  onDayPress,
}: MonthGridProps) {
  return (
    <View style={styles.month}>
      {/* Every day's own label already names its month, so the heading is for the eye only. */}
      <Text
        variant="mini"
        tone="tertiary"
        weight="semibold"
        style={styles.monthLabel}
        importantForAccessibility="no"
      >
        {month.label}
      </Text>
      <View style={styles.row(gap)}>
        {month.grid.columns.map((column, columnIndex) => (
          <View key={columnIndex} style={styles.column(gap)}>
            {column.map((day) => (
              <DayCell
                key={day.key}
                day={day.key}
                level={day.level}
                state={day.key === selected ? 'selected' : day.state}
                label={day.label}
                size={cell}
                radius={radius}
                gap={gap}
                pressDelay={pressDelay}
                onDayPress={onDayPress}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

interface DayCellProps {
  day: string;
  level: HeatLevel;
  state: HeatCellState;
  label?: string;
  size: number;
  radius: number;
  gap: number;
  pressDelay: number;
  onDayPress?: (day: string) => void;
}

const DayCell = memo(function DayCell({
  day,
  level,
  state,
  label,
  size,
  radius,
  gap,
  pressDelay,
  onDayPress,
}: DayCellProps) {
  // An empty day that has happened keeps a hairline edge: its pale swatch alone barely parts from the
  // card, and the wave's shape must read even before anything is logged.
  const square = (
    <HeatCell
      level={level}
      state={state}
      size={size}
      radius={radius}
      outlined={level === 0 && state !== 'future' && state !== 'blank'}
    />
  );
  if (!onDayPress || !label) return square;
  return (
    <Pressable
      onPress={() => onDayPress(day)}
      hitSlop={gap / 2}
      // On a scrolling screen, a touch that becomes a scroll neither dims the day nor opens it.
      unstable_pressDelay={pressDelay || undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === 'selected' }}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      testID={`day-${day}`}
    >
      {square}
    </Pressable>
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
  // A day under the finger dims at once: feedback with no animation to run on every cell.
  pressed: { opacity: 0.55 },
});
