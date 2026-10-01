import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

const ACTIVE = 20;
const REST = 6;
const GAP = 6;
/** The part of a pill between its round ends, at its longest (the active pill). */
const STRETCH = ACTIVE - REST;
const step = motion.timing(motion.duration.normal);

/** Every dot's width and left edge at a pager position (in pages): the active pill is at `progress`. */
export function dotLayout(progress: number, count: number): { x: number; width: number }[] {
  'worklet';
  const at = Math.min(count - 1, Math.max(0, progress));
  const dots: { x: number; width: number }[] = [];
  let x = 0;
  for (let dot = 0; dot < count; dot += 1) {
    const width = ACTIVE - STRETCH * Math.min(1, Math.abs(at - dot));
    dots.push({ x, width });
    x += width + GAP;
  }
  return dots;
}

export interface PageDotsProps {
  count: number;
  index: number;
  /**
   * The pager's position, in pages. Given, the dots follow the finger: the active pill stretches from one
   * dot to the next as the page is swiped. Without it, the dots ease to the new index.
   */
  progress?: SharedValue<number>;
}

/**
 * One dot, moved by transforms only (it follows the finger every frame, so it never changes size and
 * never asks for a layout): two round ends and the stretch between them, which scales from its left edge.
 */
function Dot({ dot, count, progress }: { dot: number; count: number; progress: SharedValue<number> }) {
  const { theme } = useUnistyles();
  const active = theme.colors.accentText;
  const rest = theme.colors.border2;
  const colour = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(Math.min(1, Math.abs(progress.get() - dot)), [0, 1], [active, rest]),
  }));
  const place = useAnimatedStyle(() => ({
    transform: [{ translateX: dotLayout(progress.get(), count)[dot]?.x ?? 0 }],
  }));
  const stretch = useAnimatedStyle(() => ({
    // Never exactly 0: a zero scale is a degenerate transform on some platforms.
    transform: [
      { scaleX: Math.max(0.001, ((dotLayout(progress.get(), count)[dot]?.width ?? REST) - REST) / STRETCH) },
    ],
  }));
  const end = useAnimatedStyle(() => ({
    transform: [{ translateX: (dotLayout(progress.get(), count)[dot]?.width ?? REST) - REST }],
  }));

  return (
    <Animated.View style={[styles.dot, place]}>
      <Animated.View style={[styles.stretch, colour, stretch]} />
      <Animated.View style={[styles.cap, colour]} />
      <Animated.View style={[styles.cap, colour, end]} />
    </Animated.View>
  );
}

/** Eases to `index` on its own, when there's no pager for the dots to follow. */
function useIndexProgress(index: number): SharedValue<number> {
  const progress = useSharedValue(index);
  useEffect(() => {
    progress.set(withTiming(index, step));
  }, [index, progress]);
  return progress;
}

/** Progress dots; the active one is a 20×6 accent pill. Read as "Step 2 of 3". */
export function PageDots({ count, index, progress }: PageDotsProps) {
  const own = useIndexProgress(index);
  const position = progress ?? own;
  // The dots' widths always add up to the same, so the row is a fixed size and only the dots move in it.
  const width = ACTIVE + (count - 1) * (REST + GAP);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      <View style={styles.track(width)}>
        {Array.from({ length: count }, (_, dot) => (
          <Dot key={dot} dot={dot} count={count} progress={position} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  track: (width: number) => ({ width, height: REST }),
  dot: { position: 'absolute', left: 0, top: 0, width: ACTIVE, height: REST },
  cap: { position: 'absolute', left: 0, top: 0, width: REST, height: REST, borderRadius: REST / 2 },
  stretch: {
    position: 'absolute',
    left: REST / 2,
    top: 0,
    width: STRETCH,
    height: REST,
    transformOrigin: 'left',
  },
});
