import { memo, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatCellState } from '@/features/heatmap/domain/grid';
import { useMotion, type HeatLevel, type HeatmapRevealStyle } from '@/theme';

export interface HeatCellProps {
  level: HeatLevel;
  size: number;
  radius?: number;
  state?: HeatCellState;
  /** Plays the "just checked in" pulse (the motion system skips it with Reduce Motion). */
  pulse?: boolean;
  /**
   * This cell's part of the heatmap reveal, from the motion system (Heatmap provides it, already
   * resolved against Reduce Motion, so a grid of cells doesn't each subscribe to the setting).
   */
  appear?: HeatmapRevealStyle | null;
  /**
   * Hairline outline so a very pale swatch still reads as a cell on a light card. An empty day that has
   * happened (level 0) is carved into the card instead, and the dent takes the outline's place.
   */
  outlined?: boolean;
  /**
   * Checked in on Streak, nothing logged here: a small gold mark sits in the dent. Only ever drawn on a
   * carved cell (level 0, happened, not blank) — a trained fill never carries it.
   */
  marked?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Only cells that pulse subscribe to the motion system. */
function PulsingCell({ style, children }: { style: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { pulse } = useMotion();
  return <Animated.View style={[style, pulse(true)]}>{children}</Animated.View>;
}

/** One day on the heatmap. Knows how a level looks, not which counts produce it. */
export const HeatCell = memo(function HeatCell({
  level,
  size,
  radius,
  state = 'default',
  pulse = false,
  appear,
  outlined = false,
  marked = false,
  onPress,
  accessibilityLabel,
}: HeatCellProps) {
  // A day that has happened with no workout is carved into the card; the dent replaces the outline.
  const carved = level === 0 && state !== 'future' && state !== 'blank';
  const style = [
    styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state, carved),
    outlined && !carved && styles.outline,
  ];
  // Decorative: the cell's own accessibilityLabel already says "Checked in on Streak" for a marked day.
  const dot = carved && marked ? <View style={styles.dot(size)} /> : null;
  const cell = appear ? (
    <Animated.View style={[style, appear]}>{dot}</Animated.View>
  ) : pulse ? (
    <PulsingCell style={style}>{dot}</PulsingCell>
  ) : (
    <View style={style}>{dot}</View>
  );

  if (!onPress) return cell;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: state === 'selected' }}
    >
      {cell}
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  cell: (level: HeatLevel, size: number, radius: number, state: HeatCellState, carved: boolean) => ({
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor:
      state === 'future' || state === 'blank'
        ? 'transparent'
        : carved
          ? theme.material.carved.background
          : theme.heat[level],
    // The darker fill marks the dent on its own; the inner shadow (Android 10+) gives it depth.
    boxShadow: carved ? theme.material.carved.shadow : undefined,
    borderWidth: state === 'future' ? 1 : 0,
    borderColor: theme.colors.border,
    // A day still to come is a faint outline: set apart from an outlined empty day that has happened.
    opacity: state === 'future' ? 0.5 : 1,
    outlineWidth: state === 'today' ? 1.5 : state === 'selected' ? 2 : 0,
    outlineOffset: 1.5,
    outlineColor: state === 'selected' ? theme.colors.accentText : theme.colors.text,
  }),
  outline: { borderWidth: 1, borderColor: theme.colors.border },
  // A small bead resting in the dent: it reads at any cell size and never collides with a trained fill
  // (marked is only ever true on a carved, level-0 cell).
  dot: (size: number) => {
    const diameter = Math.max(3, Math.round(size * 0.36));
    return {
      position: 'absolute' as const,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      backgroundColor: theme.colors.accentText,
      top: (size - diameter) / 2,
      left: (size - diameter) / 2,
    };
  },
}));
