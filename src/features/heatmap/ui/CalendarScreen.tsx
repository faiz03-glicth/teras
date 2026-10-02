import { memo, useCallback, useDeferredValue } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import {
  Card,
  EmptyState,
  ErrorState,
  HeatCell,
  ListRow,
  LoadingState,
  NavBar,
  PressDelay,
  SectionLabel,
} from '@/shared/ui';
import { motion } from '@/theme';

import { TrainingWave } from './components/TrainingWave';
import { useCalendarViewModel, type CalendarMonth } from './useCalendarViewModel';

/** Wave rows drawn with the screen's first frame: the last year. Older years follow a moment later. */
const FIRST_ROWS = 4;

/**
 * The Calendar: the whole training wave, then every workout by month. The months are a virtualised list
 * (a long history only renders what is on screen); the wave and its legend lead it.
 */
export function CalendarScreen() {
  const vm = useCalendarViewModel();
  const { onOpenWorkout } = vm;
  // Years of history are thousands of cells: they render as low-priority work after the screen is up
  // (and after new data lands), so opening the Calendar or a day never waits on them.
  const rows = useDeferredValue(vm.rows, vm.rows.slice(0, FIRST_ROWS));
  const renderMonth = useCallback<ListRenderItem<CalendarMonth>>(
    ({ item }) => <MonthSection month={item} onOpenWorkout={onOpenWorkout} />,
    [onOpenWorkout],
  );

  const header = (
    <View style={styles.header}>
      <NavBar title="Calendar" onBack={vm.onBack} />
      <TrainingWave
        testID="calendar-wave"
        rows={rows}
        dayLabels={vm.dayLabels}
        onDayPress={vm.onDayPress}
        selected={vm.selected}
        legendCaption={vm.legendCaption}
      />
      {vm.status === 'loading' && <LoadingState label="Loading workouts" testID="calendar-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load workouts" onRetry={vm.onRetry} testID="calendar-error" />
        </Card>
      )}
      {vm.status === 'ready' && vm.months.length === 0 && (
        <Card>
          <EmptyState icon="dumbbell" title="No workouts yet" />
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root} testID="calendar-screen">
      {/* A press that becomes a scroll never presses, as on every other scrolling screen. */}
      <PressDelay value={motion.scroll.pressDelayMs}>
        <FlatList
          data={vm.status === 'ready' ? vm.months : []}
          keyExtractor={(month) => month.key}
          renderItem={renderMonth}
          ListHeaderComponent={header}
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
  header: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  group: { gap: theme.spacing.md },
  separator: { height: theme.spacing.xl },
}));
