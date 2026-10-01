import { useEffect, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

const { selection } = motion;

/**
 * selection: how a selectable item answers a change of choice. Chosen, its icon swells a little; released,
 * it dips a little; either way it settles back to rest. Only changes play (never the first render), each
 * one starts from wherever the last left off, so rapid select/deselect never queues and always ends at
 * rest. The selected look itself (surface, border) is the component's state transition, applied at once.
 * With Reduce Motion the icon doesn't move.
 */
export function useSelectionMotion(selected: boolean) {
  const reduced = useReduceMotion();
  const scale = useSharedValue(1);
  const previous = useRef(selected);

  useEffect(() => {
    if (previous.current === selected) return;
    previous.current = selected;
    if (reduced) return;
    scale.set(
      withSequence(
        withTiming(
          selected ? selection.select : selection.deselect,
          motion.timing(selection.riseMs, 'enter'),
        ),
        withTiming(1, motion.timing(selection.settleMs, 'standard')),
      ),
    );
  }, [selected, reduced, scale]);

  // Reduce Motion turned on mid-response: settle at once.
  useEffect(() => {
    if (reduced) scale.set(1);
  }, [reduced, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}
