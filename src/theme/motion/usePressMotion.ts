import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

const { press: liquid } = motion.liquid;

export type PressFeedback = 'scale' | 'liquid';

/**
 * press: the shared touch feedback, one motion for every tappable thing.
 * - 'scale' (default): shrinks on press-in, springs back on release;
 * - 'liquid': squashes wide and flat while held, then wobbles back like a droplet (the + button).
 * It never blocks anything: the press itself is handled at once, the motion only follows it. Decorative,
 * so it is skipped entirely with Reduce Motion (a release still settles, instantly).
 */
export function usePressMotion(feedback: PressFeedback = 'scale', scaleTo: number = motion.press.scale) {
  const reduced = useReduceMotion();
  const isLiquid = feedback === 'liquid';
  // 0 = at rest, 1 = fully pressed. Springs may overshoot past either end, which is what makes it wobble.
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    const p = pressed.get();
    if (isLiquid) {
      return {
        transform: [{ scaleX: 1 + (liquid.squashX - 1) * p }, { scaleY: 1 + (liquid.squashY - 1) * p }],
      };
    }
    return { transform: [{ scale: 1 + (scaleTo - 1) * p }] };
  });

  return {
    style,
    pressIn: () => {
      if (reduced) return;
      pressed.set(isLiquid ? withSpring(1, liquid.hold) : withTiming(1, motion.timing(motion.duration.fast)));
    },
    // Always released (also if Reduce Motion turned on mid-press); ReduceMotion.System makes it a jump then.
    pressOut: () => pressed.set(withSpring(0, isLiquid ? liquid.release : motion.spring)),
  };
}
