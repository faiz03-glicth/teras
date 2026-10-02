import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  HeatCell,
  IconBadge,
  LevelChip,
  LoadingState,
  Screen,
  Text,
} from '@/shared/ui';

import { StatsRow } from './components/StatsRow';
import { useWorkoutSavedViewModel } from './useWorkoutSavedViewModel';

const CELL = 28;

/**
 * Straight after Finish: the save confirmed, what the workout came to, and where its day landed among
 * the rest of the week. Done goes Home, where the workout now leads the feed.
 */
export function WorkoutSavedScreen({ id }: { id: string | null }) {
  const vm = useWorkoutSavedViewModel(id);
  const { theme } = useUnistyles();

  return (
    <Screen scroll testID="workout-saved-screen" contentStyle={styles.content}>
      {vm.status === 'loading' && <LoadingState label="Loading the workout" testID="saved-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this workout" onRetry={vm.onRetry} testID="saved-error" />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Workout not found" />
        </Card>
      )}

      {vm.status === 'ready' && (
        <>
          <View style={styles.head}>
            <IconBadge icon="check" color={theme.colors.accentText} size={48} />
            <Text variant="title" accessibilityRole="header">
              Workout saved
            </Text>
            <Text variant="footnote" tone="secondary">
              {vm.title}
            </Text>
          </View>

          <Card>
            <StatsRow stats={vm.stats} testID="saved-stats" />
          </Card>

          <Card style={styles.records} testID="saved-records">
            <Text variant="headline">{vm.records.title}</Text>
            {vm.records.rows.map((record) => (
              <View key={record.id} style={styles.record}>
                <IconBadge icon="trophy" color={theme.colors.accentText} size={36} />
                <View style={styles.recordText}>
                  <Text variant="sub" weight="semibold">
                    {record.name}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    {record.line}
                  </Text>
                </View>
              </View>
            ))}
            {vm.records.rows.length === 0 && (
              <Text variant="footnote" tone="secondary">
                {vm.records.note}
              </Text>
            )}
          </Card>

          <Card style={styles.day}>
            <View style={styles.level}>
              <LevelChip level={vm.level} label={vm.levelName} />
              <Text variant="footnote" tone="secondary">
                {vm.standing}
              </Text>
            </View>
            <View style={styles.week} accessible accessibilityLabel={vm.weekLabel} testID="saved-week">
              {vm.week.days.map((day, index) => (
                <View key={day.key} style={styles.weekday}>
                  <HeatCell
                    level={day.level}
                    size={CELL}
                    radius={8}
                    state={day.key === vm.week.ringed ? 'selected' : day.state}
                    outlined={day.level === 0 && day.state !== 'future'}
                  />
                  <Text variant="mini" tone="tertiary">
                    {vm.week.letters[index]}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {vm.status !== 'loading' && <Button label="Done" onPress={vm.onDone} testID="saved-done" />}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  head: { alignItems: 'center', gap: theme.spacing.sm },
  records: { gap: theme.spacing.md },
  record: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  recordText: { flex: 1 },
  day: { gap: theme.spacing.md },
  level: { gap: theme.spacing.xs },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { alignItems: 'center', gap: theme.spacing.xs },
}));
