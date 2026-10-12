import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, IconButton, Screen, Text } from '@/shared/ui';

import { formatMinutes } from '../domain/duration';
import { PAST_LOG_SECONDS } from '../domain/pastLog';
import { LiveStats } from './components/LiveStats';
import { RestBar } from './components/RestBar';
import { SetRow, SetTableHeader } from './components/SetRow';
import { StatsRow } from './components/StatsRow';
import { UndoBar } from './components/UndoBar';
import { WorkoutOptionsMenu } from './components/WorkoutOptionsMenu';
import { useActiveWorkoutViewModel } from './useActiveWorkoutViewModel';

/**
 * The workout in progress. Its top bar holds what is always in reach: Minimize, its name, its options
 * (Add exercise, and Discard, confirmed) and the gold Finish. Below: its running numbers and one set
 * table per exercise. The rest bar docks under it all, so the countdown stays in view while sets are
 * filled in.
 */
export function ActiveWorkoutScreen() {
  const vm = useActiveWorkoutViewModel();
  const workout = vm.workout;
  const empty = workout?.exercises.length === 0;
  const [options, setOptions] = useState(false);

  return (
    <Screen
      scroll
      keyboard
      testID="active-workout-screen"
      contentStyle={styles.content}
      footer={
        <View>
          {/* Floats over the table (never pushes it up), docked just above the rest bar when there is one. */}
          {vm.undo && (
            <View style={styles.undoDock} pointerEvents="box-none">
              <UndoBar key={vm.undo.key} label={vm.undo.label} onUndo={vm.onUndoRemoveSet} />
            </View>
          )}
          {vm.restEndsAt && (
            <RestBar
              endsAt={vm.restEndsAt}
              onLess={vm.onRestLess}
              onMore={vm.onRestMore}
              onSkip={vm.onSkipRest}
              onOver={vm.onRestOver}
            />
          )}
        </View>
      }
    >
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-down"
          onPress={vm.onMinimize}
          accessibilityLabel={vm.pastLog ? 'Close' : 'Minimize'}
          testID="minimize-workout"
        />
        <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={styles.title}>
          {workout?.name ?? 'Workout'}
        </Text>
        <IconButton
          icon="more"
          onPress={() => setOptions(true)}
          accessibilityLabel="Workout options"
          testID="workout-options"
        />
        {!empty && (
          <Button
            label={vm.pastLog ? 'Save' : 'Finish'}
            size="sm"
            onPress={vm.onFinish}
            loading={vm.finishing}
            loadingLabel="Saving"
            testID="finish-workout"
          />
        )}
      </View>

      {workout && (
        <View style={styles.stats}>
          {/* A past day's log was never timed: its Time is the length it is saved with, not a clock. */}
          {vm.pastLog ? (
            <StatsRow
              stats={[{ label: 'Time', value: formatMinutes(PAST_LOG_SECONDS) }, ...vm.stats]}
              testID="active-workout-stats"
            />
          ) : (
            <LiveStats startedAt={workout.startedAt} stats={vm.stats} testID="active-workout-stats" />
          )}
        </View>
      )}

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
              tone="danger"
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
                onDelete={vm.onRemoveSet}
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

      <WorkoutOptionsMenu
        visible={options}
        onClose={() => setOptions(false)}
        onAddExercise={vm.onAddExercise}
        onDiscard={vm.onDiscardNow}
        discardLine={vm.discardLine}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  title: { flex: 1, textAlign: 'center' },
  // The running numbers sit in a well pressed into the page, as the other live readouts do.
  stats: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.material.inset.background,
    boxShadow: theme.material.inset.shadow,
  },
  group: { gap: theme.spacing.sm },
  undoDock: { position: 'absolute', left: 0, right: 0, bottom: '100%' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  exerciseName: { flex: 1 },
}));
