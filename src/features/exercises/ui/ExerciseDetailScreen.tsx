import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  BarChart,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  ListRow,
  LoadingState,
  NavBar,
  Pill,
  PressableScale,
  Screen,
  StatTile,
  Text,
} from '@/shared/ui';

import { useExerciseDetailViewModel, type ExerciseDetailViewModel } from './useExerciseDetailViewModel';

/**
 * One exercise, as the prototype has it: name and tags, the muscles it works, Add to workout while one
 * is running, its record and estimated max, its best set each week, and the sessions it was done in.
 */
export function ExerciseDetailScreen({ id }: { id: string | null }) {
  const vm = useExerciseDetailViewModel(id);

  return (
    <Screen scroll testID="exercise-detail-screen" contentStyle={styles.content}>
      <NavBar
        onBack={vm.onBack}
        right={
          vm.status === 'ready' && (
            <IconButton
              icon="heart"
              plain
              active={vm.favourite}
              onPress={vm.onToggleFavourite}
              accessibilityLabel={vm.favourite ? 'Remove from favourites' : 'Add to favourites'}
              testID="exercise-favourite"
            />
          )
        }
      />

      {vm.status === 'loading' && <LoadingState label="Loading the exercise" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this exercise" onRetry={vm.onRetry} />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Exercise not found" />
        </Card>
      )}

      {vm.status === 'ready' && <Ready vm={vm} />}
    </Screen>
  );
}

function Ready({ vm }: { vm: ExerciseDetailViewModel }) {
  return (
    <>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          {vm.name}
        </Text>
        <View style={styles.tags}>
          {vm.tags.map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
        </View>
      </View>

      <Card style={styles.muscles}>
        <Muscle label="Primary" value={vm.primary} />
        <Muscle label="Secondary" value={vm.secondary} />
      </Card>

      {vm.canAdd && (
        <Button label="Add to workout" icon="plus" onPress={vm.onAddToWorkout} testID="exercise-add" />
      )}

      {vm.stats.length > 0 && (
        <View style={styles.stats}>
          {vm.stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <StatTile
                label={stat.label}
                value={stat.value}
                labelFirst
                accessibilityLabel={stat.accessibilityLabel}
                footer={stat.record ? <Pill label="PR" icon="trophy" tone="accent" /> : undefined}
              />
            </View>
          ))}
        </View>
      )}

      {vm.chart && (
        <Card style={styles.chart}>
          <Text variant="headline">Best set each week</Text>
          <BarChart
            values={vm.chart.values}
            labels={vm.chart.labels}
            labelMode="spread"
            slots={vm.chart.slots}
            highlight="max"
            accessibilityLabel={vm.chart.accessibilityLabel}
          />
        </Card>
      )}

      {vm.sessions.length > 0 ? (
        <View style={styles.group}>
          <View style={styles.sectionHead}>
            <Text variant="headline">History</Text>
            <Text variant="footnote" tone="secondary">
              {vm.sessionCount}
            </Text>
          </View>
          <Card tight divided>
            {vm.sessions.map((session) => (
              <SessionRow key={session.id} session={session} onPress={vm.onOpenSession} />
            ))}
          </Card>
        </View>
      ) : (
        <Text variant="footnote" tone="secondary">
          No history yet. Records and progress appear once you log it.
        </Text>
      )}

      {vm.similar.length > 0 && (
        <View style={styles.group}>
          <Text variant="headline">{vm.similarTitle}</Text>
          <Card tight divided>
            {vm.similar.map((one) => (
              <ListRow
                key={one.id}
                title={one.name}
                trailing="chevron"
                onPress={() => vm.onOpenExercise(one.id)}
                testID={`similar-${one.id}`}
              />
            ))}
          </Card>
        </View>
      )}
    </>
  );
}

function Muscle({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.muscle} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text variant="footnote" tone="secondary" style={styles.muscleLabel}>
        {label}
      </Text>
      <Text variant="sub" weight="semibold" style={styles.muscleValue}>
        {value}
      </Text>
    </View>
  );
}

function SessionRow({
  session,
  onPress,
}: {
  session: ExerciseDetailViewModel['sessions'][number];
  onPress: (workoutId: string) => void;
}) {
  const { theme } = useUnistyles();
  return (
    <PressableScale
      onPress={() => onPress(session.id)}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={session.accessibilityLabel}
      style={styles.session}
      testID={`session-${session.id}`}
    >
      <View style={styles.sessionText}>
        <Text variant="sub" weight="semibold">
          {session.title}
        </Text>
        <Text variant="footnote" tone="secondary">
          {session.sets}
        </Text>
      </View>
      {session.record && <Pill label="PR" icon="trophy" tone="accent" />}
      <Icon name="chevron-right" size={18} color={theme.colors.text3} />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  head: { gap: theme.spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  muscles: { gap: theme.spacing.sm },
  muscle: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.md },
  muscleLabel: { width: 84 },
  muscleValue: { flex: 1 },
  stats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1 },
  chart: { gap: theme.spacing.md },
  group: { gap: theme.spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  session: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  sessionText: { flex: 1, gap: 1 },
}));
