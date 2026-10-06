import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ISODate } from '@/shared/lib/date/isoDate';
import {
  Button,
  Card,
  ErrorState,
  HeatCell,
  IconBadge,
  ListRow,
  LoadingState,
  SectionLabel,
  SheetLayout,
  Text,
} from '@/shared/ui';

import { useDaySheetViewModel } from './useDaySheetViewModel';

/**
 * A day of the wave: its level, the few words that explain it, and the workouts behind it. Opening one
 * replaces the sheet with that workout; a rest day says so in a word and nothing more. A day checked in
 * on Streak but not logged here says that instead, with the way to log it.
 */
export function DaySheet({ date }: { date: ISODate | null }) {
  const vm = useDaySheetViewModel(date);
  const { theme } = useUnistyles();

  return (
    <SheetLayout eyebrow={vm.eyebrow} title={vm.title} onClose={vm.onClose} testID="day-sheet">
      {vm.status === 'loading' && <LoadingState label="Loading the day" testID="day-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this day" onRetry={vm.onRetry} testID="day-error" />
        </Card>
      )}
      {vm.status === 'ready' && (
        <>
          {vm.streak ? (
            <Card>
              <View style={styles.streak}>
                <View
                  style={styles.level}
                  accessible
                  accessibilityLabel={`${vm.streak.title}. ${vm.streak.body}.`}
                  testID="day-streak"
                >
                  <IconBadge icon="check" color={theme.colors.accentText} size={36} />
                  <View style={styles.levelText}>
                    <Text variant="headline">{vm.streak.title}</Text>
                    <Text variant="footnote" tone="secondary">
                      {vm.streak.body}
                    </Text>
                  </View>
                </View>
                <Button
                  label={vm.streak.action}
                  variant="secondary"
                  loading={vm.streak.starting}
                  loadingLabel="Starting"
                  onPress={vm.onLogStreakDay}
                  testID="day-streak-log"
                />
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.level} accessible accessibilityLabel={vm.summaryLabel} testID="day-level">
                <HeatCell level={vm.level} size={36} radius={10} outlined={vm.level === 0} />
                <View style={styles.levelText}>
                  <Text variant="headline">{vm.levelName}</Text>
                  <Text variant="footnote" tone="secondary">
                    {vm.standing}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {(vm.inProgress || vm.rows.length > 0) && (
            <View style={styles.group}>
              <SectionLabel>Workouts</SectionLabel>
              <Card tight divided>
                {vm.inProgress && (
                  <ListRow
                    title={vm.inProgress.title}
                    description={vm.inProgress.meta}
                    trailing="chevron"
                    onPress={vm.onResume}
                    accessibilityHint="Opens the workout in progress"
                    testID="day-in-progress"
                  />
                )}
                {vm.rows.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.title}
                    description={row.meta}
                    trailing="chevron"
                    onPress={() => vm.onOpenWorkout(row.id)}
                    accessibilityHint="Opens the workout"
                    testID={`day-workout-${row.id}`}
                  />
                ))}
              </Card>
            </View>
          )}
        </>
      )}
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  level: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelText: { flex: 1, gap: 2 },
  streak: { gap: theme.spacing.md },
  group: { gap: theme.spacing.md },
}));
