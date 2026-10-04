import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LevelChip,
  LoadingState,
  NavBar,
  Pill,
  PressableScale,
  Screen,
  Text,
} from '@/shared/ui';

import { useSessionViewModel } from './useSessionViewModel';

/**
 * A logged workout as it was recorded: name and level, when, its three numbers, then every exercise with
 * the sets that were completed, the set holding an exercise's record marked PR. An exercise's heading opens
 * that exercise. Read-only: history is never edited from here.
 */
export function SessionScreen({ id }: { id: string | null }) {
  const vm = useSessionViewModel(id);
  const { theme } = useUnistyles();

  return (
    <Screen scroll testID="session-screen" contentStyle={styles.content}>
      <NavBar onBack={vm.onBack} />

      {vm.status === 'loading' && <LoadingState label="Loading the workout" testID="session-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this workout" onRetry={vm.onRetry} testID="session-error" />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Workout not found" />
        </Card>
      )}

      {vm.status === 'ready' && (
        <>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <Text variant="title" accessibilityRole="header" style={styles.title}>
                {vm.name}
              </Text>
              <LevelChip level={vm.level} label={vm.levelName} />
            </View>
            <Text variant="footnote" tone="secondary">
              {vm.when}
            </Text>
          </View>

          <Card>
            <View
              style={styles.stats}
              accessible
              accessibilityLabel={vm.stats.map((stat) => `${stat.label}, ${stat.value}`).join('. ')}
            >
              {vm.stats.map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text variant="caption" tone="secondary">
                    {stat.label}
                  </Text>
                  <Text variant="headline" style={styles.number}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {vm.exercises.map((exercise) => (
            <Card key={exercise.id} testID={`session-exercise-${exercise.id}`} style={styles.exercise}>
              <PressableScale
                style={styles.exerciseHead}
                onPress={() => vm.onOpenExercise(exercise.exerciseId)}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}, ${exercise.count}`}
                accessibilityHint="Opens the exercise"
                testID={`session-exercise-open-${exercise.id}`}
              >
                <Text variant="headline" style={styles.grow}>
                  {exercise.name}
                </Text>
                <Text variant="footnote" tone="secondary">
                  {exercise.count}
                </Text>
                <Icon name="chevron-right" size={18} color={theme.colors.text3} />
              </PressableScale>
              {exercise.sets.map((set) => (
                <View
                  key={set.id}
                  style={styles.set}
                  accessible
                  accessibilityLabel={`Set ${set.number}, ${set.label}, completed${set.record ? ', personal record' : ''}`}
                  testID={set.record ? `session-record-${set.id}` : undefined}
                >
                  <Text variant="sub" weight="semibold" tone="tertiary" style={styles.setNumber}>
                    {set.number}
                  </Text>
                  <Text variant="sub" style={[styles.grow, styles.number]}>
                    {set.label}
                  </Text>
                  {set.record && (
                    // Pill aligns itself to the top; held here, it centres on the row like the rest.
                    <View>
                      <Pill label="PR" icon="trophy" tone="accent" />
                    </View>
                  )}
                  <Icon name="check" size={16} color={theme.colors.accentText} />
                </View>
              ))}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  head: { gap: theme.spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  title: { flex: 1 },
  stats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1, gap: 2 },
  number: { fontVariant: ['tabular-nums'] },
  exercise: { gap: theme.spacing.sm },
  // The whole heading is the target, at least 44 pt tall like every other control.
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44 },
  grow: { flex: 1 },
  set: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 28 },
  // A fixed column, so every set's numbers line up.
  setNumber: { width: 20 },
}));
