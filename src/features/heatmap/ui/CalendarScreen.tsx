import { memo, useCallback, useMemo } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import {
  Card,
  EmptyState,
  ErrorState,
  HeatCell,
  type HeatmapMonth,
  ListRow,
  LoadingState,
  NavBar,
  PressDelay,
  SectionLabel,
} from '@/shared/ui';
import { motion } from '@/theme';

import { TrainingWave } from './components/TrainingWave';
import { useCalendarViewModel, type CalendarMonth } from './useCalendarViewModel';

/** One virtualised item: a row of the wave (newest first) or a month of workouts below it. */
type CalendarItem =
  | { kind: 'wave'; key: string; row: HeatmapMonth[]; first: boolean; last: boolean }
  | { kind: 'month'; key: string; month: CalendarMonth };

const columnsOf = (row: readonly HeatmapMonth[]) =>
  row.reduce((sum, month) => sum + month.grid.columns.length, 0);

/**
 * The Calendar: the whole training wave, then every workout by month. Both are one virtualised list (a
 * long history only renders what is on screen): each wave row is an item, then each month.
 */
export function CalendarScreen() {
  const vm = useCalendarViewModel();
  const { onOpenWorkout, onDayPress, dayLabels, legendCaption, selected } = vm;
  const ready = vm.status === 'ready';

  const items = useMemo<CalendarItem[]>(
    () => [
      ...vm.rows.map<CalendarItem>((row, index) => ({
        kind: 'wave',
        key: `wave-${row[0]?.key ?? index}`,
        row,
        first: index === 0,
        last: index === vm.rows.length - 1,
      })),
      ...(ready ? vm.months : []).map<CalendarItem>((month) => ({
        kind: 'month',
        key: `month-${month.key}`,
        month,
      })),
    ],
    [ready, vm.months, vm.rows],
  );
  // Every row sizes its cells as the widest row would, so the panels line up as one wave.
  const columns = useMemo(() => Math.max(0, ...vm.rows.map(columnsOf)), [vm.rows]);

  const renderItem = useCallback<ListRenderItem<CalendarItem>>(
    ({ item }) =>
      item.kind === 'wave' ? (
        <TrainingWave
          testID={item.first ? 'calendar-wave' : undefined}
          rows={[item.row]}
          columns={columns}
          legend={item.last}
          dayLabels={dayLabels}
          onDayPress={onDayPress}
          selected={selected}
          legendCaption={legendCaption}
        />
      ) : (
        <MonthSection month={item.month} onOpenWorkout={onOpenWorkout} />
      ),
    [columns, dayLabels, legendCaption, onDayPress, onOpenWorkout, selected],
  );

  const header = (
    <View style={styles.header}>
      <NavBar title="Calendar" onBack={vm.onBack} />
    </View>
  );
  // The states sit under the wave, as before.
  const showStates = !ready || vm.months.length === 0;
  const footer = showStates ? (
    <View style={styles.footer}>
      {vm.status === 'loading' && <LoadingState label="Loading workouts" testID="calendar-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load workouts" onRetry={vm.onRetry} testID="calendar-error" />
        </Card>
      )}
      {ready && vm.months.length === 0 && (
        <Card>
          <EmptyState icon="dumbbell" title="No workouts yet" />
        </Card>
      )}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root} testID="calendar-screen">
      {/* A press that becomes a scroll never presses, as on every other scrolling screen. */}
      <PressDelay value={motion.scroll.pressDelayMs}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.content}
          initialNumToRender={3}
          windowSize={7}
        />
      </PressDelay>
    </SafeAreaView>
  );
}

const Separator = () => <View style={styles.separator} />;

const MonthSection = memo(function MonthSection({
  month,
  onOpenWorkout,
}: {
  month: CalendarMonth;
  onOpenWorkout: (id: string) => void;
}) {
  return (
    <View style={styles.group} testID={`calendar-month-${month.key}`}>
      <SectionLabel>{month.title}</SectionLabel>
      <Card tight divided>
        {month.rows.map((row) => (
          <ListRow
            key={row.id}
            title={row.title}
            description={row.meta}
            leading={<HeatCell level={row.level} size={14} radius={4} outlined={row.level === 0} />}
            trailing="chevron"
            onPress={() => onOpenWorkout(row.id)}
            accessibilityHint="Opens the workout"
            testID={`calendar-workout-${row.id}`}
          />
        ))}
      </Card>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xxl },
  header: { paddingBottom: theme.spacing.xl },
  footer: { gap: theme.spacing.xl, paddingTop: theme.spacing.xl },
  group: { gap: theme.spacing.md },
  separator: { height: theme.spacing.xl },
}));
