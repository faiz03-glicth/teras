import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button, Icon, Text } from '@/shared/ui';

export interface RestBarProps {
  /** "1:24". */
  clock: string;
  /** "Rest, 1 min 24 s left": what a screen reader hears instead of a ticking clock. */
  accessibilityLabel: string;
  onLess: () => void;
  onMore: () => void;
  onSkip: () => void;
}

/**
 * The rest between sets, docked under the workout (the prototype's rest bar): the countdown stays in view
 * while sets are still being filled in, and nothing has to be closed to carry on.
 */
export function RestBar({ clock, accessibilityLabel, onLess, onMore, onSkip }: RestBarProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.bar} testID="rest-bar">
      <View style={styles.time} accessible accessibilityLabel={accessibilityLabel}>
        <Icon name="clock" size={18} color={theme.colors.accentText} />
        <Text variant="sub" tone="secondary">
          Rest
        </Text>
        <Text variant="title3" style={styles.clock}>
          {clock}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label="−15"
          variant="secondary"
          size="sm"
          onPress={onLess}
          accessibilityLabel="Take off 15 seconds"
        />
        <Button
          label="+15"
          variant="secondary"
          size="sm"
          onPress={onMore}
          accessibilityLabel="Add 15 seconds"
        />
        <Button label="Skip" variant="ghost" size="sm" onPress={onSkip} accessibilityLabel="Skip rest" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.material.bar.background,
    boxShadow: theme.material.bar.shadow,
    // Reads as a bar even where the shadow does not draw.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  time: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  clock: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
}));
