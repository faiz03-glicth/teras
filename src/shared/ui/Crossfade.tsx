import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

export interface CrossfadeProps {
  active: boolean;
  /** The active rendering. It stays in the layout, so make it the larger of the two (e.g. the bolder label). */
  on: ReactNode;
  /** The inactive rendering, laid over it. */
  off: ReactNode;
}

/**
 * Two renderings of one element that fade into each other when a state flips (active ↔ inactive), so
 * things that can't be interpolated — a font weight, an SVG icon's colour — still change smoothly. The
 * size never changes (no layout shift), the fade runs natively, and it's instant with Reduce Motion.
 * Only one rendering is ever exposed to screen readers.
 */
export function Crossfade({ active, on, off }: CrossfadeProps) {
  const fade = useStateTransition('opacity', 'normal');
  return (
    <View>
      <Animated.View
        style={[{ opacity: active ? 1 : 0 }, fade]}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!active}
      >
        {on}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.over, { opacity: active ? 0 : 1 }, fade]}
        importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={active}
      >
        {off}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  over: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
