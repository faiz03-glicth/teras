import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { LevelChip, PressableScale, Text } from '@/shared/ui';
import { motion } from '@/theme';

import type { FeedEntry } from '../useHomeViewModel';

/**
 * One past workout, scannable without reading a sentence: what and how hard, when, its three numbers,
 * then its first exercises. The whole card is the way into the full record; held, it sinks into the
 * material like a key.
 */
export const FeedCard = memo(function FeedCard({
  entry,
  onPress,
}: {
  entry: FeedEntry;
  onPress: (id: string) => void;
}) {
  return (
    <PressableScale
      onPress={() => onPress(entry.id)}
      scaleTo={motion.press.subtleScale}
      accessibilityRole="button"
      accessibilityLabel={entry.accessibilityLabel}
      accessibilityHint="Opens the workout"
      style={styles.card}
      pressedStyle={styles.pressed}
      testID={`feed-${entry.id}`}
    >
      <View style={styles.heading}>
        <Text variant="headline" numberOfLines={1} style={styles.name}>
          {entry.name}
        </Text>
        <LevelChip level={entry.level} label={entry.levelName} />
      </View>
      <Text variant="footnote" tone="secondary">
        {entry.when}
      </Text>

      <View style={styles.stats}>
        {entry.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text variant="caption" tone="secondary">
              {stat.label}
            </Text>
            <Text variant="sub" weight="semibold" style={styles.number}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {entry.lines.length > 0 && (
        <View style={styles.lines}>
          {entry.lines.map((line, index) => (
            <View key={index} style={styles.line}>
              <Text variant="footnote" tone="secondary" style={styles.sets}>
                {line.sets}
              </Text>
              <Text variant="footnote" numberOfLines={1} style={styles.exercise}>
                {line.name}
              </Text>
            </View>
          ))}
          {entry.more ? (
            <Text variant="footnote" tone="tertiary">
              {entry.more}
            </Text>
          ) : null}
        </View>
      )}
    </PressableScale>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.material.raised.background,
    boxShadow: theme.material.raised.shadow,
  },
  pressed: { boxShadow: theme.material.pressed.shadow },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  name: { flex: 1 },
  stats: { flexDirection: 'row', gap: theme.spacing.xxl, marginTop: theme.spacing.sm },
  stat: { gap: 2 },
  number: { fontVariant: ['tabular-nums'] },
  lines: {
    gap: 3,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  line: { flexDirection: 'row', gap: theme.spacing.sm },
  // A fixed column, so the exercise names line up under each other.
  sets: { width: 48 },
  exercise: { flex: 1 },
}));
