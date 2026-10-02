import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, PressableScale, Text } from '@/shared/ui';
import { motion } from '@/theme';

import type { ActiveEntry } from '../useHomeViewModel';

/**
 * The workout in progress, first in the feed: the way back to it. It reports a state rather than a
 * record, so it is the gold-tinted well (as the rest timer is), set apart from the raised past workouts
 * by its colour, its label and its Resume as well as its depth.
 */
export function ActiveWorkoutCard({ entry, onPress }: { entry: ActiveEntry; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={motion.press.subtleScale}
      accessibilityRole="button"
      accessibilityLabel={entry.accessibilityLabel}
      accessibilityHint="Opens the workout in progress"
      style={styles.card}
      testID="home-in-progress"
    >
      <View style={styles.status}>
        <View style={styles.dot} />
        <Text variant="caption" weight="semibold" tone="accent">
          In progress
        </Text>
      </View>
      <View style={styles.heading}>
        <Text variant="headline" numberOfLines={1} style={styles.name}>
          {entry.name}
        </Text>
        <View style={styles.resume}>
          <Text variant="sub" weight="semibold" tone="accent">
            Resume
          </Text>
          <Icon name="chevron-right" size={18} color={theme.colors.accentText} />
        </View>
      </View>
      <Text variant="footnote" tone="secondary">
        {entry.meta}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.accentSoft,
    boxShadow: theme.material.inset.shadow,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accentText },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  name: { flex: 1 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));
