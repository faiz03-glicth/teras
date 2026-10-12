import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { TrainingWave } from '@/features/heatmap/ui/components/TrainingWave';
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
        rows={vm.waveRows}
        dayLabels={vm.dayLabels}
        onDayPress={vm.onDayPress}
        legendCaption={vm.legendCaption}
        header={vm.waveHeader}
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

type HomeWaveProps = Omit<ComponentProps<typeof TrainingWave>, 'selected' | 'testID'>;

/** The wave owns the selected-day subscription, so tapping a day re-renders the wave and not all of Home. */
function HomeWave(props: HomeWaveProps) {
  const selected = useHomeSelectedDay();
  return <TrainingWave {...props} testID="training-wave" selected={selected} />;
}

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
