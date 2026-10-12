import { memo, useState, type ComponentProps, type ReactNode } from 'react';
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
  /**
   * Hairline outline so a very pale swatch still reads as a cell on a light card. An empty day that has
   * happened (level 0) is carved into the card instead, and the dent takes the outline's place.
   */
  outlined?: boolean;
  /**
   * Logged with no details (a Workout check-in on Streak, nothing logged here): a small gold mark sits in
   * the dent. Only ever drawn on a carved cell (level 0, happened, not blank) — a trained fill never
   * carries it.
   */
  marked?: boolean;
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
function AnimatedCellButton({
  style,
  press,
  children,
}: {
  style: CellStyle;
  press: PressProps;
  children?: ReactNode;
}) {
  const [held, setHeld] = useState(false);
  return (
    <AnimatedPressable
      {...press}
      onPressIn={() => setHeld(true)}
      onPressOut={() => setHeld(false)}
      style={[style, held && styles.pressed]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Only cells that pulse subscribe to the motion system. */
function PulsingCell({
  style,
  press,
  children,
}: {
  style: CellStyle;
  press?: PressProps;
  children?: ReactNode;
}) {
  const { pulse } = useMotion();
  const pulsing = [style, pulse(true)];
  return press ? (
    <AnimatedCellButton style={pulsing} press={press}>
      {children}
    </AnimatedCellButton>
  ) : (
    <Animated.View style={pulsing}>{children}</Animated.View>
  );
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
  hitSlop,
  pressDelay,
  testID,
}: HeatCellProps) {
  // A day that has happened with no workout is carved into the card; the dent replaces the outline.
  const carved = level === 0 && state !== 'future' && state !== 'blank';
  const style = [
    styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state, carved),
    outlined && !carved && styles.outline,
  ];
  // Decorative: the cell's own accessibilityLabel already says "Logged, no details" for a marked day. It is
  // a child of every kind of cell below, pressable or not, so the gold mark never drops off a pressable one.
  const dot = carved && marked ? <View style={styles.dot(size)} /> : null;
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
      <AnimatedCellButton style={revealing} press={press}>
        {dot}
      </AnimatedCellButton>
    ) : (
      <Animated.View style={revealing}>{dot}</Animated.View>
    );
  }
  if (pulse) {
    return (
      <PulsingCell style={style} press={press}>
        {dot}
      </PulsingCell>
    );
  }
  // A still pressable cell is dimmed at once while held, by Pressable itself: no state, no animation.
  if (press) {
    return (
      <Pressable {...press} style={({ pressed }) => (pressed ? [...style, styles.pressed] : style)}>
        {dot}
      </Pressable>
    );
  }
  return <View style={style}>{dot}</View>;
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
    // The darker fill marks the dent on its own; its edges give it depth, the shade up-left and the light
    // down-right. Edges, not inner shadows: Android blurs each inner shadow offscreen, dozens of times a month.
    ...(carved
      ? {
          borderWidth: theme.material.carved.edge,
          borderTopColor: theme.material.carved.shade,
          borderLeftColor: theme.material.carved.shade,
          borderBottomColor: theme.material.carved.light,
          borderRightColor: theme.material.carved.light,
        }
      : { borderWidth: state === 'future' ? 1 : 0, borderColor: theme.colors.border }),
    // A day still to come is a faint outline: set apart from an outlined empty day that has happened.
    opacity: state === 'future' ? 0.5 : 1,
    outlineWidth: state === 'today' ? 1.5 : state === 'selected' ? 2 : 0,
    outlineOffset: 1.5,
    outlineColor: state === 'selected' ? theme.colors.accentText : theme.colors.text,
  }),
  outline: { borderWidth: 1, borderColor: theme.colors.border },
  // A small bead resting in the dent: it reads at any cell size and never collides with a trained fill
  // (marked is only ever true on a carved, level-0 cell). It is placed from inside the dent's edges, so
  // centring it takes them off.
  dot: (size: number) => {
    const diameter = Math.max(3, Math.round(size * 0.36));
    const offset = (size - diameter) / 2 - theme.material.carved.edge;
    return {
      position: 'absolute' as const,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      backgroundColor: theme.colors.accentText,
      top: offset,
      left: offset,
    };
  },
  pressed: { opacity: 0.55 },
}));
