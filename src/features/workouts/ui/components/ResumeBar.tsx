import { memo, useCallback } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { openActiveWorkout } from '@/shared/actions';
import { formatDuration } from '@/shared/lib/format/formatDuration';
import { PressableScale, Text } from '@/shared/ui';
import { depthStyle, motion, surfaceStyle } from '@/theme';

import { countSets } from '../../domain/labels';
import type { ActiveWorkoutSummary } from '../../hooks/useWorkoutQueries';
import { useClockValue } from '../useClockValue';

/** Its height on screen, so the tab screens can leave room above the tab bar for it. */
export const RESUME_BAR_HEIGHT = 62;

/** The time since it started; the clock lives here, so only this line redraws each second. */
function Elapsed({ startedAt, setsDone }: { startedAt: string; setsDone: number }) {
  const start = Date.parse(startedAt);
  const elapsed = useClockValue(
    useCallback((now: number) => Math.max(0, Math.floor((now - start) / 1000)), [start]),
  );
  return (
    <Text variant="footnote" tone="secondary" style={styles.number}>
      {`${formatDuration(elapsed)} · ${countSets(setsDone)} logged`}
    </Text>
  );
}

/**
 * The workout in progress, docked above the tab bar on every tab: what it is, how long it has run and
 * what is logged, and the gold Resume. The whole bar is the way back into it.
 */
export const ResumeBar = memo(function ResumeBar({ workout }: { workout: ActiveWorkoutSummary }) {
  return (
    <PressableScale
      onPress={() => openActiveWorkout()}
      scaleTo={motion.press.subtleScale}
      accessibilityRole="button"
      accessibilityLabel={`Resume ${workout.name}`}
      accessibilityHint="Opens the workout in progress"
      style={styles.bar}
      pressedStyle={styles.pressed}
      testID="resume-bar"
    >
      {/* The live dot: gold, haloed, as on the in-progress card. */}
      <View style={styles.halo}>
        <View style={styles.dot} />
      </View>
      <View style={styles.text}>
        <Text variant="sub" weight="semibold" numberOfLines={1}>
          {workout.name}
        </Text>
        <Elapsed startedAt={workout.startedAt} setsDone={workout.setsDone} />
      </View>
      <View style={styles.resume}>
        <Text variant="sub" weight="semibold" style={styles.resumeLabel}>
          Resume
        </Text>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create((theme) => ({
  bar: {
    height: RESUME_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.lg,
    paddingRight: 10,
    borderRadius: 18,
    ...surfaceStyle(theme.material.raised),
  },
  pressed: depthStyle(theme.material.pressed),
  // The halo is a disc under the dot, not a spread shadow, and takes no room: Black draws no box-shadow.
  halo: {
    width: 18,
    height: 18,
    margin: -4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.material.accent.background,
  },
  text: { flex: 1, gap: 1 },
  number: { fontVariant: ['tabular-nums'] },
  // Reads as the gold key; the bar itself takes the press.
  resume: {
    height: 42,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.key,
    justifyContent: 'center',
    backgroundColor: theme.material.accent.background,
    borderWidth: theme.material.accent.edge ? 1 : 0,
    borderColor: theme.material.accent.edge ?? 'transparent',
  },
  resumeLabel: { color: theme.colors.onAccent },
}));
