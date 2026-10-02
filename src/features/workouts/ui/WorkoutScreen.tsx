import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, IconButton, ListRow, Screen, SectionLabel, Text } from '@/shared/ui';

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
                {summarise(vm.inProgress.exerciseCount)}
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
        <View style={styles.sectionHead}>
          <SectionLabel>Routines</SectionLabel>
          <Button
            label="New routine"
            icon="plus"
            variant="quiet"
            size="sm"
            onPress={vm.onNewRoutine}
            testID="routine-new"
          />
        </View>
        {vm.routines.length === 0 ? (
          <Card>
            <EmptyState icon="dumbbell" title="No routines yet" />
          </Card>
        ) : (
          <Card tight divided>
            {vm.routines.map((routine) => (
              <View key={routine.id} style={styles.routine}>
                <View style={styles.routineMain}>
                  <ListRow
                    title={routine.name}
                    description={routineLine(routine.exerciseCount, routine.exercises)}
                    descriptionLines={1}
                    trailing="none"
                    onPress={() => vm.onStartRoutine(routine.id)}
                    accessibilityHint={routine.exerciseCount === 0 ? 'Opens it to fill' : 'Starts a workout'}
                    testID={`routine-${routine.id}`}
                  />
                </View>
                <IconButton
                  icon="pencil"
                  plain
                  onPress={() => vm.onEditRoutine(routine.id)}
                  accessibilityLabel={`Edit ${routine.name}`}
                  testID={`routine-edit-${routine.id}`}
                />
              </View>
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
  count === 0 ? 'No exercises yet' : `${count} exercise${count === 1 ? '' : 's'} · ${names.join(', ')}`;

const summarise = (count: number) =>
  count === 0 ? 'Nothing logged yet' : `${count} exercise${count === 1 ? '' : 's'}`;

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routine: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  routineMain: { flex: 1 },
  resume: { gap: theme.spacing.md },
}));
