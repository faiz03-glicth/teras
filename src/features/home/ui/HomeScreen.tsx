import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card, EmptyState, ListRow, Screen, SectionLabel, Text } from '@/shared/ui';

import { useHomeViewModel } from './useHomeViewModel';

/** Home: the training wave and workout feed go here once workouts can be logged. */
export function HomeScreen() {
  const vm = useHomeViewModel();
  return (
    <Screen scroll withTabBar testID="home-screen" contentStyle={styles.content}>
      <View>
        <Text variant="title" accessibilityRole="header" testID="home-title">
          {vm.title}
        </Text>
        <Text variant="sub" tone="secondary" testID="home-account">
          {vm.accountLine}
        </Text>
      </View>

      <Card>
        <EmptyState
          icon="dumbbell"
          title="No workouts yet"
          body="Your training wave appears here after your first workout."
          action={{ label: 'Go to Workout', onPress: vm.onOpenWorkout }}
        />
      </Card>

      <View style={styles.group}>
        <SectionLabel>Your setup</SectionLabel>
        <Card tight divided>
          {vm.setup.map((row) => (
            <ListRow key={row.label} compact title={row.label} value={row.value} trailing="none" />
          ))}
        </Card>
      </View>

      <View style={styles.group}>
        <SectionLabel>Streak</SectionLabel>
        <Card>
          <Text variant="headline">{vm.streakTitle}</Text>
          <Text variant="footnote" tone="secondary">
            {vm.streakLine}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
}));
