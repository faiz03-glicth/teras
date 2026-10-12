import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  HeatCell,
  Icon,
  LoadingState,
  Screen,
  StatTile,
  Text,
} from '@/shared/ui';
import { useMotion } from '@/theme';

import { useWorkoutSavedViewModel } from './useWorkoutSavedViewModel';

const MEDAL = 76;
const CELL = 18;

/**
 * Straight after Finish: the save confirmed, where its day landed on the training wave this week, what
 * the workout came to and what it set. Each part rises in after the one before; the week's days sweep in
 * like the heatmap does. Done sits under the thumb and goes Home, where the workout now leads the feed.
 */
export function WorkoutSavedScreen({ id }: { id: string | null }) {
  const vm = useWorkoutSavedViewModel(id);
  const { theme } = useUnistyles();
  const motion = useMotion();

  return (
    <Screen
      scroll
      testID="workout-saved-screen"
      contentStyle={styles.content}
      footer={
        vm.status !== 'loading' && (
          <Animated.View style={[styles.footer, vm.status === 'ready' && motion.staggerIn(5)]}>
            <Button label="Done" onPress={vm.onDone} testID="saved-done" />
          </Animated.View>
        )
      }
    >
      {vm.status === 'loading' && <LoadingState label="Loading the workout" testID="saved-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this workout" onRetry={vm.onRetry} testID="saved-error" />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Workout not found" />
        </Card>
      )}

      {vm.status === 'ready' && (
        <>
          <Animated.View style={[styles.head, motion.staggerIn(0)]}>
            {/* The gold medal: the same raised gold as the app's primary key. */}
            <View style={styles.medal}>
              <Icon name="check" size={36} color={theme.colors.onAccent} />
            </View>
            <View style={styles.titles}>
              <Text variant="title" accessibilityRole="header">
                Workout saved
              </Text>
              <Text variant="sub" tone="secondary">
                {vm.title}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={motion.staggerIn(1)}>
            <Card style={styles.wave}>
              <Text variant="caption" tone="tertiary" weight="semibold" style={styles.eyebrow}>
                THIS WEEK ON YOUR WAVE
              </Text>
              <View style={styles.waveRow}>
                <View accessible accessibilityLabel={vm.weekLabel} testID="saved-week" style={styles.strip}>
                  <View style={styles.cells}>
                    {vm.week.days.map((day, index) => (
                      <HeatCell
                        key={day.key}
                        level={day.level}
                        size={CELL}
                        radius={5}
                        state={day.key === vm.week.ringed ? 'selected' : day.state}
                        outlined={day.level === 0 && day.state !== 'future'}
                        appear={motion.heatmapReveal(index, 0)}
                      />
                    ))}
                  </View>
                  <View style={styles.cells}>
                    {vm.week.letters.map((letter, index) => (
                      <Text key={index} variant="mini" tone="tertiary" align="center" style={styles.letter}>
                        {letter}
                      </Text>
                    ))}
                  </View>
                </View>
                <View style={styles.level}>
                  <Text variant="headline">{vm.levelName}</Text>
                  <Text variant="footnote" tone="secondary">
                    {vm.standing}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View
            style={[styles.tiles, motion.staggerIn(2)]}
            accessible
            accessibilityLabel={vm.stats.map((stat) => `${stat.label}, ${stat.value}`).join('. ')}
            testID="saved-stats"
          >
            {vm.stats.map((stat) => (
              <View key={stat.label} style={styles.tile}>
                <StatTile label={stat.label} value={stat.value} labelFirst />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={motion.staggerIn(3)}>
            <Card style={styles.records} testID="saved-records">
              <View style={styles.recordsHead}>
                <Icon name="trophy" size={18} color={theme.colors.accentText} />
                <Text variant="headline">{vm.records.title}</Text>
              </View>
              {vm.records.rows.map((record) => (
                <View key={record.id} style={styles.record}>
                  <Text variant="sub" weight="semibold" style={styles.recordName}>
                    {record.name}
                  </Text>
                  <Text variant="sub" tone="secondary">
                    {record.line}
                  </Text>
                </View>
              ))}
              {vm.records.rows.length === 0 && (
                <Text variant="footnote" tone="secondary">
                  {vm.records.note}
                </Text>
              )}
            </Card>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.lg, paddingTop: theme.spacing.xxxl, paddingBottom: theme.spacing.xxl },
  head: { alignItems: 'center', gap: theme.spacing.lg },
  medal: {
    width: MEDAL,
    height: MEDAL,
    borderRadius: MEDAL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.material.accent.background,
    boxShadow: theme.material.accent.shadow,
    // The gold keeps its dark edge only where the material says gold alone would not separate.
    borderWidth: theme.material.accent.edge ? 1.5 : 0,
    borderColor: theme.material.accent.edge ?? 'transparent',
  },
  titles: { alignItems: 'center', gap: theme.spacing.xs },
  wave: { gap: theme.spacing.md },
  eyebrow: { letterSpacing: 0.8 },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  strip: { gap: theme.spacing.xs },
  cells: { flexDirection: 'row', gap: theme.spacing.xs },
  letter: { width: CELL },
  level: { flex: 1, gap: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  // Two to a row.
  tile: { flexBasis: '45%', flexGrow: 1 },
  records: { gap: theme.spacing.md },
  recordsHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  record: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm },
  recordName: { flex: 1 },
  footer: {
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
  },
}));
