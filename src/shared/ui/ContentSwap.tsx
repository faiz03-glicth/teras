import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';

import { layoutMotion } from '@/theme';

export interface ContentSwapProps {
  /** What is being shown (a label, 'busy', …). A different id cross-fades to the new content. */
  id: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The motion system's `fade` for content replaced in place: a button's label becoming "Connecting…", a
 * Skip that no longer applies. The old content fades out where it was while the new fades in, on a surface
 * that stays put (no layout jump). Only swaps animate: nothing on first render, and nothing when the whole
 * control goes away (its screen or page is the one transitioning then).
 */
export function ContentSwap({ id, children, style }: ContentSwapProps) {
  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View key={id} entering={layoutMotion.fade.in} exiting={layoutMotion.fade.out} style={style}>
        {children}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}
