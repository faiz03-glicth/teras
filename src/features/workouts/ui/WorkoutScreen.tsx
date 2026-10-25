import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, ListRow, Screen, SectionLabel, Text } from '@/shared/ui';

import { RoutineCard } from './components/RoutineCard';
import { useWorkoutViewModel } from './useWorkoutViewModel';

/**
 * Workout: the gold key leads (start from nothing; while one runs, the Resume bar leads back), then each routine as a card
 * of its own (open it to see what to beat, or Start it straight away), then the exercise library.
 */
export function WorkoutScreen() {
  const vm = useWorkoutViewModel();

  return (
    <Screen scroll withTabBar testID="workout-screen" contentStyle={styles.content}>
      <Text variant="title" accessibilityRole="header">
        Workout
      </Text>

      {/* While one is running, the Resume bar over the tabs is the way back to it: no second key here. */}
      {!vm.inProgress && (
        <Button
          label="Start empty workout"
          icon="plus"
          size="lg"
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
          vm.routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              id={routine.id}
              name={routine.name}
              line={routine.line}
              last={routine.last}
              onOpen={() => vm.onOpenRoutine(routine.id)}
              onEdit={() => vm.onEditRoutine(routine.id)}
              onStart={() => vm.onStartRoutine(routine.id)}
            />
          ))
        )}
      </View>

      <Card tight>
        <ListRow
          title="Exercise Library"
          icon="dumbbell"
          trailing="chevron"
          onPress={vm.onOpenLibrary}
          testID="workout-library"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));
