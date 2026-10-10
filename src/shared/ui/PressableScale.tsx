import { useState, type ComponentProps, type ReactNode } from 'react';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion, usePressMotion, type PressFeedback } from '@/theme';

import { CachedSurface, type SurfaceBleed } from './CachedSurface';
import { usePressDelay } from './pressDelay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A control's material: its fill and shadow, and the look that replaces them under a finger. */
export interface PressSurface {
  style: StyleProp<ViewStyle>;
  pressed?: StyleProp<ViewStyle>;
  /** Room around the control for its shadow (see CachedSurface): a small key's unless said otherwise. */
  bleed?: SurfaceBleed;
}

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Any animated style, including Reanimated CSS transitions (see useStateTransition). */
  style?: ComponentProps<typeof AnimatedPressable>['style'];
  /** How far the control shrinks while pressed (0.94–0.98). Ignored by the liquid feedback. */
  scaleTo?: number;
  /** The motion system's press preset: 'scale' (default) or 'liquid' (the + button). */
  feedback?: PressFeedback;
  /**
   * Applied while a finger is on the control: the material's pressed state (the lift swapped for a shallow
   * press, from materials/soft.ts). Controls name the state; none writes a shadow of its own.
   */
  pressedStyle?: ComponentProps<typeof AnimatedPressable>['style'];
  /**
   * The control's material, drawn once into a texture behind its content (CachedSurface) instead of
   * blurred again on every frame the control moves: as it shrinks under a finger, as its screen slides in.
   * Its `pressed` look is drawn once on each press. The control's own style then has no fill or shadow.
   */
  surface?: PressSurface;
  children?: ReactNode;
}

/**
 * Every tappable control's press feedback, from the motion system (see usePressMotion). Inside something
 * swipeable (a pager) the press waits a moment, so a swipe that starts on the control doesn't press it.
 */
export function PressableScale({
  scaleTo = motion.press.scale,
  feedback = 'scale',
  style,
  pressedStyle,
  surface,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const press = usePressMotion(feedback, scaleTo);
  const pressDelay = usePressDelay();
  // Only tracked when there is a pressed look to show, so plain pressables never re-render on touch.
  const [held, setHeld] = useState(false);
  const showsHeld = pressedStyle !== undefined || surface?.pressed !== undefined;

  return (
    <AnimatedPressable
      unstable_pressDelay={pressDelay || undefined}
      {...rest}
      style={[style, held && pressedStyle, press.style]}
      onPressIn={(event: GestureResponderEvent) => {
        press.pressIn();
        if (showsHeld) setHeld(true);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.pressOut();
        if (showsHeld) setHeld(false);
        onPressOut?.(event);
      }}
    >
      {surface && (
        <CachedSurface style={[surface.style, held && surface.pressed]} bleed={surface.bleed ?? 'key'} />
      )}
      {children}
    </AnimatedPressable>
  );
}
