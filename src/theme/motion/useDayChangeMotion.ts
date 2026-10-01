import { useEffect, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

const { dayChange } = motion;

/**
 * dayChange: content that belongs to a chosen day, refreshed in place when the day changes. It only
 * styles (never blocks a touch), plays nothing on the first render, restarts from the top if the day
 * changes again mid-way, and doesn't move with Reduce Motion.
 */
export function useDayChangeMotion(day: string) {
  const reduced = useReduceMotion();
  const progress = useSharedValue(1);
  const previous = useRef(day);

  useEffect(() => {
    if (previous.current === day) return;
    previous.current = day;
    if (reduced) return;
    progress.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, motion.timing(dayChange.durationMs, 'enter')),
      ),
    );
  }, [day, reduced, progress]);

  // Reduce Motion turned on mid-change: settle at once.
  useEffect(() => {
    if (reduced) progress.set(1);
  }, [reduced, progress]);

  return useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: dayChange.fromOpacity + (1 - dayChange.fromOpacity) * p,
      transform: [{ translateY: dayChange.distance * (1 - p) }],
    };
  });
}
