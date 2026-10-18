import { memo, useCallback, useMemo, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { TrainingWave } from '@/features/heatmap/ui/components/TrainingWave';
import { haptics } from '@/shared/lib/haptics';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionLabel, Text } from '@/shared/ui';

import { FeedCard } from './components/FeedCard';
import { WeekChip } from './components/WeekChip';

import { useHomeSelectedDay, useHomeViewModel } from './useHomeViewModel';

/** Home: the training wave on top, then the workouts behind it. */
export function HomeScreen() {
  const vm = useHomeViewModel();

  return (
    <Screen scroll withTabBar testID="home-screen" contentStyle={styles.content}>
      <View style={styles.headRow}>
        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            Home
          </Text>
          <Text variant="footnote" tone="secondary">
            {vm.dateLine}
          </Text>
        </View>
        <WeekChip label={vm.week.label} accessibilityLabel={vm.week.accessibilityLabel} />
      </View>

      <HomeWave
        wave={vm.wave}
        dayLabels={vm.dayLabels}
        onDayPress={vm.onDayPress}
        legendCaption={vm.legendCaption}
      />

      {vm.canStart && (
        <Button
          label="Start workout"
          icon="plus"
          size="lg"
          onPress={vm.onStartWorkout}
          loading={vm.starting}
          loadingLabel="Starting"
          testID="home-start-workout"
        />
      )}

      <View style={styles.group}>
        <SectionLabel>Workouts</SectionLabel>
        {vm.status === 'loading' && <LoadingState label="Loading workouts" testID="home-loading" />}
        {vm.status === 'error' && (
          <Card>
            <ErrorState title="Couldn't load workouts" onRetry={vm.onRetry} testID="home-error" />
          </Card>
        )}
        {vm.empty && (
          <Card>
            <EmptyState icon="dumbbell" title="No workouts yet" />
          </Card>
        )}
        {vm.entries.map((entry) => (
          <FeedCard key={entry.id} entry={entry} onPress={vm.onOpenWorkout} />
        ))}
      </View>
    </Screen>
  );
}

type WaveVersion = { rows: ComponentProps<typeof TrainingWave>['rows']; subtitle: string };
type HomeWaveProps = Omit<ComponentProps<typeof TrainingWave>, 'selected' | 'testID' | 'rows' | 'header'> & {
  wave: { collapsed: WaveVersion; expanded: WaveVersion };
};

/**
 * The wave owns the selected-day subscription and whether it shows three months or six, so tapping a day
 * or its header re-renders the wave and not all of Home.
 */
const HomeWave = memo(function HomeWave({ wave, ...props }: HomeWaveProps) {
  const selected = useHomeSelectedDay();
  const [expanded, setExpanded] = useState(false);
  const onToggle = useCallback(() => {
    haptics.selection();
    setExpanded((open) => !open);
  }, []);
  const shown = expanded ? wave.expanded : wave.collapsed;
  const header = useMemo(
    () => ({ title: 'Training wave', subtitle: shown.subtitle, expanded, onToggle }),
    [expanded, onToggle, shown.subtitle],
  );
  return (
    <TrainingWave {...props} rows={shown.rows} header={header} testID="training-wave" selected={selected} />
  );
});

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  head: { gap: 2, flexShrink: 1 },
  group: { gap: theme.spacing.md },
}));
