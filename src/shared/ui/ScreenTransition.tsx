import { useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';

import { layoutMotion, type Direction } from '@/theme';

export interface ScreenTransitionProps {
  /** Where the page sits in its flow (step 0, 1, 2…). A different index is a different page. */
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one place a screen's content changes page (onboarding steps, login steps). The page only says where
 * it is in its flow; the motion system turns the change into pushForward (a later page arrives from the
 * right) or pushBack (an earlier one returns from the left), identical in every theme.
 *
 * The first page doesn't animate: the screen itself is already arriving, and when the screen leaves, its page
 * leaves with it (only page changes animate). Every change starts from what is on screen, so rapid taps
 * never queue: the latest page wins, and the previous one just fades away.
 */
export function ScreenTransition({ index, children, style }: ScreenTransitionProps) {
  const [shown, setShown] = useState<{ index: number; direction: Direction }>({
    index,
    direction: 'forward',
  });
  // React's "adjust state when a prop changes" pattern: the new page renders with its direction at once.
  if (shown.index !== index) setShown({ index, direction: index > shown.index ? 'forward' : 'back' });

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View
        key={index}
        entering={layoutMotion.push[shown.direction]}
        exiting={layoutMotion.push.out}
        style={style}
      >
        {children}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}
