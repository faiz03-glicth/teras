import { createContext, useContext, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { motion, usePressMotion, type PressFeedback } from '@/theme';

import { CachedSurface, type SurfaceBleed } from './CachedSurface';
import { usePressDelay } from './pressDelay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** What a pressable shares with what is drawn inside it: whether a finger is down, and the press itself. */
export interface PressState {
  held: boolean;
  /** 0 at rest, 1 held (springs may overshoot): read it in an animated style, never in render. */
  progress: SharedValue<number> | null;
}

const AT_REST: PressState = { held: false, progress: null };
const PressStateContext = createContext<PressState>(AT_REST);

/** Gives what is inside a pressable its press state; only a pressable that shares it pays for this. */
function PressStateScope({ held, progress, children }: PressState & { children: ReactNode }) {
  const state = useMemo(() => ({ held, progress }), [held, progress]);
  return <PressStateContext value={state}>{children}</PressStateContext>;
}

/**
 * The state of the PressableScale this sits in (one that was given `shareState`): a small key inside a
 * pressable row reads it to show its own held look. Outside one, always at rest.
 */
export function usePressState(): PressState {
  return useContext(PressStateContext);
}

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
  /**
   * How far the control moves down while held (pt), on the UI thread with the shrink: a small raised key
   * sinking as its ledge gives way. Default 0.
   */
  sink?: number;
  /**
   * Shares the press state with what is inside (`usePressState`): only the pieces that read it draw again
   * when a finger goes down or comes up. Off, a plain pressable tracks nothing.
   */
  shareState?: boolean;
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
  sink = 0,
  shareState = false,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const press = usePressMotion(feedback, scaleTo, sink);
  const pressDelay = usePressDelay();
  // Only tracked when there is a pressed look to show, so plain pressables never re-render on touch.
  const [held, setHeld] = useState(false);
  const showsHeld = pressedStyle !== undefined || surface?.pressed !== undefined || shareState;
  const content = (
    <>
      {surface && (
        <CachedSurface style={[surface.style, held && surface.pressed]} bleed={surface.bleed ?? 'key'} />
      )}
      {children}
    </>
  );

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
      {shareState ? (
        <PressStateScope held={held} progress={press.progress}>
          {content}
        </PressStateScope>
      ) : (
        content
      )}
    </AnimatedPressable>
  );
}
