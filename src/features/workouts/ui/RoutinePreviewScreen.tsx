import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  HeatCell,
  Icon,
  LoadingState,
  NavBar,
  Screen,
  SectionLabel,
  Text,
} from '@/shared/ui';

import { useRoutinePreviewViewModel } from './useRoutinePreviewViewModel';

/**
 * A routine, opened from its card before it starts: its exercises, each with last week's best and what
 * beats it, and how the last time went. Start stays docked under it all; Edit sits in the bar.
 */
export function RoutinePreviewScreen({ id }: { id: string | null }) {
  const vm = useRoutinePreviewViewModel(id);
  const { theme } = useUnistyles();
  const ready = vm.status === 'ready';

  return (
    <Screen
      scroll
      testID="routine-preview-screen"
      contentStyle={styles.content}
      footer={
        ready && (
          <View style={styles.footer}>
            <Button
              label={vm.startLabel}
              size="lg"
              onPress={vm.onStart}
              loading={vm.starting}
              loadingLabel="Starting"
              testID="routine-preview-start"
            />
          </View>
        )
      }
    >
      <NavBar
        onBack={vm.onBack}
        right={
          ready && (
            <Button
              label="Edit"
              icon="pencil"
              variant="quiet"
              size="sm"
              onPress={vm.onEdit}
              accessibilityLabel={`Edit ${vm.name}`}
              testID="routine-preview-edit"
            />
          )
        }
      />

      {vm.status === 'loading' && (
        <LoadingState label="Loading the routine" testID="routine-preview-loading" />
      )}
      {vm.status === 'error' && (
        <Card>
          <ErrorState
            title="Couldn't load this routine"
            onRetry={vm.onRetry}
            testID="routine-preview-error"
          />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Routine not found" />
        </Card>
      )}

      {ready && (
        <>
          <View style={styles.head}>
            <Text variant="title" accessibilityRole="header">
              {vm.name}
            </Text>
            <Text variant="footnote" tone="secondary">
              {vm.line}
            </Text>
            {vm.last && (
              <View style={styles.last} accessible accessibilityLabel={vm.last.label}>
                <HeatCell level={vm.last.level} size={10} radius={3} />
                <Text variant="caption" tone="tertiary">
                  {vm.last.label}
                </Text>
              </View>
            )}
          </View>

          {vm.exercises.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>To beat last week</SectionLabel>
              <Card tight divided>
                {vm.exercises.map((exercise) => (
                  <View
                    key={exercise.key}
                    style={styles.row}
                    accessible
                    accessibilityLabel={exercise.accessibilityLabel}
                    testID={`routine-preview-exercise-${exercise.key}`}
                  >
                    <View style={styles.what}>
                      <Text variant="body" weight="semibold" numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <Text variant="footnote" tone="secondary" numberOfLines={1}>
                        {exercise.line}
                      </Text>
                    </View>
                    {exercise.target && (
                      <View style={styles.beat}>
                        <View style={styles.target}>
                          <Icon name="trending-up" size={14} color={theme.colors.accentText} />
                          <Text variant="sub" weight="semibold" tone="accent">
                            {exercise.target}
                          </Text>
                        </View>
                        {exercise.heavier && (
                          <Text variant="caption" tone="tertiary">
                            or {exercise.heavier}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ) : (
            <Card>
              <EmptyState icon="dumbbell" title="No exercises yet" />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  head: { gap: theme.spacing.xs },
  last: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.xs },
  group: { gap: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  what: { flex: 1, minWidth: 0, gap: 2 },
  beat: { alignItems: 'flex-end', gap: 2 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
}));
