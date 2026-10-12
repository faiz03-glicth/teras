import { memo, useState, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
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
  /** Pressable cells only: widens the tap target, delays the press on scrolling screens, names the cell. */
  hitSlop?: number;
  pressDelay?: number;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** What makes a cell a button: everything a Pressable takes but its style. */
type PressProps = Omit<ComponentProps<typeof Pressable>, 'style'>;

/** An animated cell's style: the cell's look plus a CSS animation (reveal or pulse). */
type CellStyle = ComponentProps<typeof Animated.View>['style'];

/**
 * A pressable cell that is also animated (revealing or pulsing): still the one view, the Pressable itself.
 * An animated view can't take Pressable's style function, so being held is its own state here.
 */
function AnimatedCellButton({ style, press }: { style: CellStyle; press: PressProps }) {
  const [held, setHeld] = useState(false);
  return (
    <AnimatedPressable
      {...press}
      onPressIn={() => setHeld(true)}
      onPressOut={() => setHeld(false)}
      style={[style, held && styles.pressed]}
    />
  );
}

/** Only cells that pulse subscribe to the motion system. */
function PulsingCell({ style, press }: { style: CellStyle; press?: PressProps }) {
  const { pulse } = useMotion();
  const pulsing = [style, pulse(true)];
  return press ? <AnimatedCellButton style={pulsing} press={press} /> : <Animated.View style={pulsing} />;
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
  hitSlop,
  pressDelay,
  testID,
}: HeatCellProps) {
  const style = [
    styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state),
    outlined && styles.outline,
  ];
  const press: PressProps | undefined = onPress
    ? {
        onPress,
        hitSlop,
        unstable_pressDelay: pressDelay || undefined,
        accessibilityRole: 'button',
        accessibilityLabel,
        accessibilityState: { selected: state === 'selected' },
        testID,
      }
    : undefined;
  // Every cell is one view, pressable or not; a pressable one keeps its reveal and pulse.
  if (appear) {
    const revealing = [style, appear];
    return press ? (
      <AnimatedCellButton style={revealing} press={press} />
    ) : (
      <Animated.View style={revealing} />
    );
  }
  if (pulse) return <PulsingCell style={style} press={press} />;
  // A still pressable cell is dimmed at once while held, by Pressable itself: no state, no animation.
  if (press) {
    return <Pressable {...press} style={({ pressed }) => (pressed ? [...style, styles.pressed] : style)} />;
  }
  return <View style={style} />;
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
  pressed: { opacity: 0.55 },
}));
