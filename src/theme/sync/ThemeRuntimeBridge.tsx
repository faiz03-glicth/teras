import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Appearance, AppState, StyleSheet } from 'react-native';
import { SystemBars, type SystemBarsEntry } from 'react-native-edge-to-edge';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { UnistylesRuntime } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';
import { useShallow } from 'zustand/react/shallow';

import { buildTheme } from '../buildTheme';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useResolvedScheme } from '../hooks/useResolvedScheme';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';
import type { ColorScheme, HeatPaletteId, VisualStyle } from '../types';

/** Everything that decides how the app looks. */
interface Look {
  scheme: ColorScheme;
  paletteId: HeatPaletteId;
  style: VisualStyle;
}

const sameLook = (a: Look, b: Look) =>
  a.scheme === b.scheme && a.paletteId === b.paletteId && a.style === b.style;
const canvasOf = (look: Look) => buildTheme(look.scheme, look.paletteId, look.style).colors.canvas;

const { themeTransition, ease } = motion;
// Opacity only, driven by the bridge itself (with Reduce Motion the veil is skipped, not shortened).
const veilIn = { duration: themeTransition.coverMs, easing: ease.exit, reduceMotion: ReduceMotion.Never };
const veilOut = {
  duration: themeTransition.revealMs,
  easing: ease.standard,
  reduceMotion: ReduceMotion.Never,
};

/**
 * Keeps the native theme, appearance and system bars in sync with the stored preferences, and makes theme
 * changes fluid (the motion system's themeTransition). The preference (e.g. "System") is stored as chosen;
 * the resolved look is derived from it.
 *
 * A change fades through the screen's own background: a veil in the CURRENT canvas colour covers the app
 * (the content fades away; the screen neither brightens nor darkens yet), the theme is swapped underneath
 * while nothing is visible, then the veil lifts and the new look emerges, the background brightening or
 * deepening gradually. Dark → Light therefore never washes to white in one step, and Light → Dark never
 * drops to black. There is never a half-themed frame, and the brand green (identical in both schemes)
 * simply stays put. The same transition in both directions, light, dark and glass alike.
 *
 * The veil is one opacity animation on the UI thread, so nothing re-renders per frame. It never plays at
 * launch (the first frame is already right), with Reduce Motion (the swap is instant), or while the app is
 * in the background. Rapid changes retarget it without a jump: a veil that is still up keeps its colour
 * and simply covers again, and the latest choice is the one revealed.
 *
 * Rendered after the app so the veil sits above everything.
 */
export function ThemeRuntimeBridge() {
  const { preference, paletteId, style } = useThemePreferencesStore(
    useShallow((s) => ({ preference: s.preference, paletteId: s.paletteId, style: s.style })),
  );
  const scheme = useResolvedScheme(preference);
  const reduced = useReduceMotion();

  const target = useMemo<Look>(() => ({ scheme, paletteId, style }), [scheme, paletteId, style]);
  // What is on screen (null until first applied) and what was asked for last: plain refs, since applying
  // a look is imperative and must never wait for a React render.
  const shown = useRef<Look | null>(null);
  const latest = useRef(target);
  const bars = useRef<SystemBarsEntry | null>(null);
  // Whether the veil is anywhere above zero (tracked here: the veil itself animates on the UI thread).
  const veilUp = useRef(false);
  const veil = useSharedValue(0);
  const veilColor = useSharedValue(canvasOf(target));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.get(), backgroundColor: veilColor.get() }));

  // Native controls (sheets, keyboards, alerts, Apple button) follow the app's choice, not just the OS.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const apply = useCallback((look: Look) => {
    shown.current = look;
    UnistylesRuntime.updateTheme('light', () => buildTheme('light', look.paletteId, look.style));
    UnistylesRuntime.updateTheme('dark', () => buildTheme('dark', look.paletteId, look.style));
    UnistylesRuntime.setTheme(look.scheme);
    UnistylesRuntime.setRootViewBackgroundColor(canvasOf(look));
    // Status and navigation bar icons: dark on the light canvas, light on the dark one.
    const bar = { style: look.scheme === 'dark' ? ('light' as const) : ('dark' as const) };
    bars.current = bars.current
      ? SystemBars.replaceStackEntry(bars.current, bar)
      : SystemBars.pushStackEntry(bar);
  }, []);

  const lowered = useCallback(() => {
    veilUp.current = false;
  }, []);

  // Called on the JS thread once the veil fully covers the app: swap, then lift after two frames.
  const reveal = useCallback(() => {
    apply(latest.current);
    veil.set(
      withDelay(
        themeTransition.holdMs,
        withTiming(0, veilOut, (finished) => {
          if (finished) scheduleOnRN(lowered);
        }),
      ),
    );
  }, [apply, veil, lowered]);

  useEffect(() => {
    latest.current = target;
    const current = shown.current;
    if (current && sameLook(target, current)) return;
    // Launch (already right on the first frame), Reduce Motion, or not on screen: apply at once.
    if (!current || reduced || AppState.currentState !== 'active') {
      veil.set(0);
      veilUp.current = false;
      apply(target);
      return;
    }
    // The veil takes the colour of what is on screen; one that's still up keeps its colour (no jump).
    if (!veilUp.current) veilColor.set(canvasOf(current));
    veilUp.current = true;
    veil.set(
      withTiming(1, veilIn, (finished) => {
        if (finished) scheduleOnRN(reveal);
      }),
    );
  }, [target, reduced, apply, reveal, veil, veilColor]);

  useEffect(
    () => () => {
      if (bars.current) SystemBars.popStackEntry(bars.current);
    },
    [],
  );

  return (
    <Animated.View
      testID="theme-veil"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, veilStyle]}
    />
  );
}
