import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { CachedSurface, Text } from '@/shared/ui';
import { motion } from '@/theme';

export interface UndoBarProps {
  /** "Set 2 deleted". */
  label: string;
  onUndo: () => void;
}

/**
 * A deleted set's way back, for a few seconds: a raised bar docked above the rest bar (or the bottom of the
 * screen), saying what went, with Undo. It belongs to this screen, so nothing else can cover it, and a
 * screen reader hears it arrive. Its shadow is drawn once into a texture (CachedSurface).
 */
export function UndoBar({ label, onUndo }: UndoBarProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.fast)}
      exiting={FadeOut.duration(motion.duration.fast)}
      style={styles.dock}
      testID="undo-bar"
    >
      <View style={styles.bar} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <CachedSurface style={styles.surface} />
        <Text variant="sub" weight="semibold" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={`Undo: ${label}`}
          hitSlop={8}
          style={styles.undo}
          testID="undo-bar-undo"
        >
          <Text variant="sub" weight="bold" style={styles.undoText}>
            Undo
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  dock: {
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.sm,
  },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.lg,
    paddingRight: 6,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: theme.material.raised.background,
    boxShadow: theme.material.raised.shadow,
  },
  label: { flex: 1 },
  undo: {
    height: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  undoText: { color: theme.colors.accentText },
}));
