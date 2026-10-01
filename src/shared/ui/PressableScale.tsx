import type { ComponentProps } from 'react';
import type { GestureResponderEvent, PressableProps } from 'react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion, usePressMotion, type PressFeedback } from '@/theme';

import { usePressDelay } from './pressDelay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Any animated style, including Reanimated CSS transitions (see useStateTransition). */
  style?: ComponentProps<typeof AnimatedPressable>['style'];
  /** How far the control shrinks while pressed (0.94–0.98). Ignored by the liquid feedback. */
  scaleTo?: number;
  /** The motion system's press preset: 'scale' (default) or 'liquid' (the + button). */
  feedback?: PressFeedback;
}

/**
 * Every tappable control's press feedback, from the motion system (see usePressMotion). Inside something
 * swipeable (a pager) the press waits a moment, so a swipe that starts on the control doesn't press it.
 */
export function PressableScale({
  scaleTo = motion.press.scale,
  feedback = 'scale',
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const press = usePressMotion(feedback, scaleTo);
  const pressDelay = usePressDelay();

  return (
    <AnimatedPressable
      unstable_pressDelay={pressDelay || undefined}
      {...rest}
      style={[style, press.style]}
      onPressIn={(event: GestureResponderEvent) => {
        press.pressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.pressOut();
        onPressOut?.(event);
      }}
    />
  );
}
