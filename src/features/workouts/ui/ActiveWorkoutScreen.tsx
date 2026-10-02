import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, IconButton, NavBar, Screen, Text } from '@/shared/ui';

import { LiveStats } from './components/LiveStats';
import { RestBar } from './components/RestBar';
import { SetRow, SetTableHeader } from './components/SetRow';
import { useActiveWorkoutViewModel } from './useActiveWorkoutViewModel';

/**
 * The workout in progress: its running numbers, one set table per exercise, then Finish. The rest bar
 * docks under it all, so the countdown stays in view while sets are filled in.
 */
export function ActiveWorkoutScreen() {
  const vm = useActiveWorkoutViewModel();
  const workout = vm.workout;
  const empty = workout?.exercises.length === 0;

  return (
    <Screen
      scroll
      keyboard
      testID="active-workout-screen"
      contentStyle={styles.content}
      footer={
        vm.restEndsAt && (
          <RestBar
            endsAt={vm.restEndsAt}
            onLess={vm.onRestLess}
            onMore={vm.onRestMore}
            onSkip={vm.onSkipRest}
            onOver={vm.onRestOver}
          />
        )
      }
    >
      <NavBar onBack={vm.onMinimize} backLabel="Minimize" />

      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {workout?.name ?? 'Workout'}
        </Text>
        {workout && (
          <LiveStats startedAt={workout.startedAt} stats={vm.stats} testID="active-workout-stats" />
        )}
      </View>

      {empty && (
        <Card>
          <EmptyState icon="dumbbell" title="Get started" />
        </Card>
      )}

      {vm.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.group}>
          <View style={styles.exerciseHeader}>
            <Text variant="headline" style={styles.exerciseName}>
              {exercise.name}
            </Text>
            <IconButton
              icon="trash"
              plain
              onPress={() => vm.onRemoveExercise(exercise.id)}
              accessibilityLabel={`Remove ${exercise.name}`}
              testID={`remove-${exercise.id}`}
            />
          </View>
          <Card tight>
            {exercise.sets.length > 0 && <SetTableHeader type={exercise.type} unit={vm.unit} />}
            {exercise.rows.map(({ set, previous, previousLabel }, index) => (
              <SetRow
                // Keyed by unit too: switching units rewrites the fields in the new unit.
                key={`${set.id}-${vm.unit}`}
                set={set}
                index={index}
                type={exercise.type}
                unit={vm.unit}
                previous={previous}
                previousLabel={previousLabel}
                onChange={vm.onChangeSet}
                onTick={vm.onTickSet}
              />
            ))}
            <Button
              label="Add set"
              variant="ghost"
              size="sm"
              onPress={() => vm.onAddSet(exercise.id)}
              testID={`add-set-${exercise.id}`}
            />
          </Card>
        </View>
      ))}

      {/* With nothing in the workout, adding an exercise is the one thing to do: it leads. */}
      <Button
        label="Add exercise"
        icon="plus"
        variant={empty ? 'primary' : 'secondary'}
        onPress={vm.onAddExercise}
        testID="add-exercise"
      />
      {!empty && (
        <Button
          label="Finish"
          onPress={vm.onFinish}
          loading={vm.finishing}
          loadingLabel="Saving"
          testID="finish-workout"
        />
      )}
      <Button
        label="Discard workout"
        variant="danger"
        size="sm"
        onPress={vm.onDiscard}
        testID="discard-workout"
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { gap: theme.spacing.md },
  group: { gap: theme.spacing.sm },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  exerciseName: { flex: 1 },
}));
