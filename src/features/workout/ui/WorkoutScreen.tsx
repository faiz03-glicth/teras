import { StyleSheet } from 'react-native-unistyles';

import { Card, EmptyState, Screen, Text } from '@/shared/ui';

/** Workout: starting workouts, routines and the exercise library are built in the next phase. */
export function WorkoutScreen() {
  return (
    <Screen scroll withTabBar testID="workout-screen" contentStyle={styles.content}>
      <Text variant="title" accessibilityRole="header">
        Workout
      </Text>
      <Card>
        <EmptyState
          icon="dumbbell"
          title="Workout logging comes next"
          body="Empty workouts, your routines and the exercise library are the next thing to be built."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
}));
