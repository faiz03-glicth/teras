import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, ListRow, Screen, SectionLabel, Text } from '@/shared/ui';

import { useWorkoutViewModel } from './useWorkoutViewModel';

/** Workout: resume what is running, start from nothing, or start from one of your routines. */
export function WorkoutScreen() {
  const vm = useWorkoutViewModel();

  return (
    <Screen scroll withTabBar testID="workout-screen" contentStyle={styles.content}>
      <Text variant="title" accessibilityRole="header">
        Workout
      </Text>

      {vm.inProgress && (
        <View style={styles.group}>
          <SectionLabel>In progress</SectionLabel>
          <Card>
            <View style={styles.resume}>
              <Text variant="headline">{vm.inProgress.name}</Text>
              <Text variant="footnote" tone="secondary">
                {summarise(vm.inProgress.exercises.length)}
              </Text>
              <Button label="Resume" onPress={vm.onResume} testID="workout-resume" />
            </View>
          </Card>
        </View>
      )}

      {!vm.inProgress && (
        <Button
          label="Start empty workout"
          icon="plus"
          onPress={vm.onStartEmpty}
          loading={vm.starting}
          loadingLabel="Starting"
          testID="workout-start-empty"
        />
      )}

      <View style={styles.group}>
        <SectionLabel>Routines</SectionLabel>
        {vm.routines.length === 0 ? (
          <Card>
            <EmptyState icon="dumbbell" title="No routines yet" />
          </Card>
        ) : (
          <Card tight divided>
            {vm.routines.map((routine) => (
              <ListRow
                key={routine.id}
                title={routine.name}
                description={routineLine(routine.exerciseCount, routine.exercises)}
                descriptionLines={1}
                trailing="chevron"
                onPress={() => vm.onStartRoutine(routine.id)}
                testID={`routine-${routine.id}`}
              />
            ))}
          </Card>
        )}
      </View>

      <Card tight>
        <ListRow
          title="Exercise library"
          description={vm.libraryLine}
          icon="dumbbell"
          trailing="chevron"
          onPress={vm.onOpenLibrary}
          testID="workout-library"
        />
      </Card>
    </Screen>
  );
}

/** "5 exercises · Bench Press, Overhead Press, …": the count is labelled, and the names cut to one line. */
const routineLine = (count: number, names: readonly string[]) =>
  `${count} exercise${count === 1 ? '' : 's'} · ${names.join(', ')}`;

const summarise = (count: number) =>
  count === 0 ? 'Nothing logged yet' : `${count} exercise${count === 1 ? '' : 's'}`;

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
  resume: { gap: theme.spacing.md },
}));
