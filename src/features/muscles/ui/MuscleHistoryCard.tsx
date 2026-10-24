import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HistoryRow } from '@/features/muscles/domain/muscleCards';
import { Card, Text } from '@/shared/ui';

import { HistoryCell } from './components/HistoryCell';
import { useMuscleHistory } from './useMuscleHistory';

const BULLET = '•';
/** The legend's swatches are smaller than the grid's cells. */
const SWATCH_SIZE = 10;

/**
 * Profile's "Muscle history": last week and this week, a muscle per row in two columns of five. A cell is
 * solid when the muscle was hit twice, half filled when once, empty when not; this week's are outlined. A
 * muscle still short of two hits this week carries a bullet after its name. Nothing is read aloud cell by
 * cell: the grid says in one phrase how many weeks were complete and which muscles are behind.
 */
export const MuscleHistoryCard = memo(function MuscleHistoryCard() {
  const vm = useMuscleHistory();
  return (
    <Card style={styles.card} testID="muscle-history-card">
      <View style={styles.head}>
        <Text variant="headline" accessibilityRole="header">
          Muscle history
        </Text>
        <Text variant="caption" tone="tertiary" style={styles.weeks}>
          Last week · this week
        </Text>
      </View>

      <View
        style={styles.grid}
        accessible
        accessibilityRole="image"
        accessibilityLabel={vm.accessibilityLabel}
        testID="muscle-history-grid"
      >
        {vm.columns.map((rows, index) => (
          <View key={index} style={styles.column}>
            {rows.map((row) => (
              <HistoryRowView key={row.group} row={row} />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.goal}>
        <Text variant="caption" tone="secondary">
          All twice:{' '}
          <Text variant="caption" weight="semibold">
            {vm.weeksTwice} of {vm.weeksShown}
          </Text>{' '}
          weeks
        </Text>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {vm.goal.map((done, index) => (
            <View key={index} style={styles.dot(done)} testID={done ? 'goal-dot-done' : 'goal-dot'} />
          ))}
        </View>
      </View>

      {vm.note && (
        <Text variant="caption" tone="tertiary" testID="muscle-history-note">
          {vm.note}
        </Text>
      )}

      <View style={styles.legendRow}>
        <Text variant="caption" tone="secondary">
          {BULLET} = behind this week
        </Text>
        <View style={styles.swatches}>
          <View style={styles.swatch}>
            <HistoryCell tier={1} size={SWATCH_SIZE} />
            <Text variant="caption" tone="tertiary">
              Once
            </Text>
          </View>
          <View style={styles.swatch}>
            <HistoryCell tier={2} size={SWATCH_SIZE} />
            <Text variant="caption" tone="tertiary">
              Twice
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
});

const HistoryRowView = memo(function HistoryRowView({ row }: { row: HistoryRow }) {
  return (
    <View style={styles.row}>
      <View style={styles.name}>
        <Text
          variant="caption"
          weight={row.behind ? 'semibold' : 'regular'}
          tone={row.behind ? 'primary' : 'secondary'}
          numberOfLines={1}
          style={styles.label}
        >
          {row.label}
        </Text>
        {row.behind && (
          <Text variant="caption" weight="regular" tone="tertiary">
            {BULLET}
          </Text>
        )}
      </View>
      <View style={styles.cells}>
        <HistoryCell tier={row.tiers[0]} />
        <HistoryCell tier={row.tiers[1]} current />
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: { gap: 10 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  weeks: { flexShrink: 1 },
  grid: { flexDirection: 'row', columnGap: 14 },
  column: { flex: 1, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  label: { flexShrink: 1 },
  cells: { flexDirection: 'row', gap: theme.spacing.xs },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dots: { flexDirection: 'row', gap: theme.spacing.xs },
  dot: (done: boolean) => ({
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: done ? theme.colors.accentEdge : theme.colors.text3,
    backgroundColor: done ? theme.colors.accent : 'transparent',
  }),
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 5 },
}));
