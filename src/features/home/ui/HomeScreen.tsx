import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { TrainingWave } from '@/features/heatmap/ui/components/TrainingWave';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionLabel, Text } from '@/shared/ui';

import { ActiveWorkoutCard } from './components/ActiveWorkoutCard';
import { FeedCard } from './components/FeedCard';

import { useHomeViewModel } from './useHomeViewModel';

/** Home: the training wave on top, then the workouts behind it. */
export function HomeScreen() {
  const vm = useHomeViewModel();

  return (
    <Screen scroll withTabBar testID="home-screen" contentStyle={styles.content}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          Home
        </Text>
        <Text variant="footnote" tone="secondary">
          {vm.dateLine}
        </Text>
      </View>

      <TrainingWave
        testID="training-wave"
        rows={vm.waveRows}
        dayLabels={vm.dayLabels}
        onDayPress={vm.onDayPress}
        selected={vm.selected}
        legendCaption={vm.legendCaption}
        header={vm.waveHeader}
      />

      <View style={styles.group}>
        <SectionLabel>Workouts</SectionLabel>
        {vm.active && <ActiveWorkoutCard entry={vm.active} onPress={vm.onResume} />}
        {vm.status === 'loading' && <LoadingState label="Loading workouts" testID="home-loading" />}
        {vm.status === 'error' && (
          <Card>
            <ErrorState title="Couldn't load workouts" onRetry={vm.onRetry} testID="home-error" />
          </Card>
        )}
        {vm.empty && (
          <Card>
            <View style={styles.empty}>
              <EmptyState icon="dumbbell" title="No workouts yet" />
              <Button label="Start workout" onPress={vm.onStartWorkout} testID="home-start-workout" />
            </View>
          </Card>
        )}
        {vm.entries.map((entry) => (
          <FeedCard key={entry.id} entry={entry} onPress={vm.onOpenWorkout} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  head: { gap: 2 },
  group: { gap: theme.spacing.md },
  empty: { gap: theme.spacing.lg },
}));
