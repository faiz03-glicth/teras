import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, EmptyState, IconButton, Screen, Text } from '@/shared/ui';

import { formatMinutes } from '../domain/duration';
import { PAST_LOG_SECONDS } from '../domain/pastLog';
import { ElapsedClock } from './components/ElapsedClock';
import { LiveStats } from './components/LiveStats';
import { RestBar } from './components/RestBar';
import { SavedChip } from './components/SavedChip';
import { SetRow, SetTableHeader } from './components/SetRow';
import { StatsRow } from './components/StatsRow';
import { UndoBar } from './components/UndoBar';
import { WorkoutOptionsMenu } from './components/WorkoutOptionsMenu';
import { useActiveWorkoutViewModel } from './useActiveWorkoutViewModel';

/**
 * The workout in progress. Its top bar holds what is always in reach: Minimize, its name with how long it
 * has run and that it is saved, and its options (Add exercise, and Discard, confirmed). Below: its running
 * numbers and one set table per exercise, and at the very end the gold Finish workout, well away from the
 * options so the header can never end a workout by accident. The rest bar docks under it all, so the
 * countdown stays in view while sets are filled in.
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
        <View style={styles.heading}>
          <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={styles.title}>
            {workout?.name ?? 'Workout'}
          </Text>
          {workout && (
            <View style={styles.status}>
              {/* A past day's log was never timed: there is no clock to show beside the chip. */}
              {!vm.pastLog && <ElapsedClock startedAt={workout.startedAt} />}
              <SavedChip saving={vm.finishing} />
            </View>
          )}
        </View>
        <IconButton
          icon="more"
          onPress={() => setOptions(true)}
          accessibilityLabel="Workout options"
          testID="workout-options"
        />
      </View>

      {workout && (
        <View style={styles.stats} testID="active-workout-panel">
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
              variant="quiet"
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
      {/* The end of the list: one full-width key, nowhere near the header's options. */}
      {!empty && (
        <Button
          label={vm.pastLog ? 'Save' : 'Finish workout'}
          icon="check"
          size="xl"
          onPress={vm.onFinish}
          loading={vm.finishing}
          loadingLabel="Saving"
          testID="finish-workout"
        />
      )}

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
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  heading: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  title: { textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  // The running numbers are a reading, not a control: a flat panel (surface and a 1px border, no lift, no
  // inset shadow to blur), so only the keys look raised.
  stats: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  group: { gap: theme.spacing.sm },
  undoDock: { position: 'absolute', left: 0, right: 0, bottom: '100%' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  exerciseName: { flex: 1 },
}));
