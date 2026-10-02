import { memo } from 'react';
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
  /** Hairline outline so a very pale swatch (level 0) still reads as a cell on a light card. */
  outlined?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Only cells that pulse subscribe to the motion system. */
function PulsingCell({ style }: { style: StyleProp<ViewStyle> }) {
  const { pulse } = useMotion();
  return <Animated.View style={[style, pulse(true)]} />;
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
  onPress,
  accessibilityLabel,
}: HeatCellProps) {
  const style = [
    styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state),
    outlined && styles.outline,
  ];
  const cell = appear ? (
    <Animated.View style={[style, appear]} />
  ) : pulse ? (
    <PulsingCell style={style} />
  ) : (
    <View style={style} />
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
  cell: (level: HeatLevel, size: number, radius: number, state: HeatCellState) => ({
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: state === 'future' || state === 'blank' ? 'transparent' : theme.heat[level],
    borderWidth: state === 'future' ? 1 : 0,
    borderColor: theme.colors.border,
    // A day still to come is a faint outline: set apart from an outlined empty day that has happened.
    opacity: state === 'future' ? 0.5 : 1,
    outlineWidth: state === 'today' ? 1.5 : state === 'selected' ? 2 : 0,
    outlineOffset: 1.5,
    outlineColor: state === 'selected' ? theme.colors.accentText : theme.colors.text,
  }),
  outline: { borderWidth: 1, borderColor: theme.colors.border },
}));
