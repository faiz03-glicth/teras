import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

// Read into constants: a worklet that touched `motion` itself would copy the whole token object.
const { slotWidth, focusScale, farOpacity, fadeSlots } = motion.datePicker;

/** PURE (worklet): how many slots slot `index` is from the centre when the wheel is scrolled to `offset`. */
export function slotDistance(offset: number, index: number): number {
  'worklet';
  return Math.abs(offset / slotWidth - index);
}

/** PURE (worklet): the slot under the centre for a scroll `offset`, within 0…count-1. */
export function centredSlot(offset: number, count: number): number {
  'worklet';
  return Math.min(count - 1, Math.max(0, Math.round(offset / slotWidth)));
}

/**
 * PURE (worklet): a slot's emphasis at `distance` slots from the centre. Scale eases in over the last
 * slot of travel (smoothstep, so it swells rather than snaps) and opacity fades out over `fadeSlots`.
 * With Reduce Motion nothing grows; the centre is still marked by its ring and the fade.
 */
export function wheelFocus(distance: number, reduced: boolean): { scale: number; opacity: number } {
  'worklet';
  const near = Math.max(0, 1 - distance);
  const swell = near * near * (3 - 2 * near);
  return {
    scale: reduced ? 1 : 1 + (focusScale - 1) * swell,
    opacity: 1 - (1 - farOpacity) * Math.min(1, distance / fadeSlots),
  };
}

/**
 * dateFocus: a date on the wheel becoming the chosen one as it nears the centre pointer. Driven by the
 * wheel's scroll position on the UI thread, frame by frame, so the emphasis is continuous (1.00, 1.02,
 * 1.05…) and moves with the finger; nothing re-renders while the dates move. Identical in every theme.
 */
export function useWheelFocus(offset: SharedValue<number>, index: number) {
  const reduced = useReduceMotion();
  return useAnimatedStyle(() => {
    const { scale, opacity } = wheelFocus(slotDistance(offset.get(), index), reduced);
    return { opacity, transform: [{ scale }] };
  });
}
