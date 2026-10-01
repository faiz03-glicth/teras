import * as Haptics from 'expo-haptics';

import { useHapticPreferencesStore } from '../state/hapticPreferencesStore';

/**
 * The haptic system: components ask for a meaning (selection, success, warning…) and this decides how it
 * feels. Haptics are supplementary feedback, never required and never waited for: a call returns at once,
 * and a device without haptics (a simulator, the web, low power mode) simply feels nothing, no error.
 * The person can turn them off (Appearance); that choice is checked here, so no caller ever does.
 */
const enabled = () => useHapticPreferencesStore.getState().haptics;

const fire = (effect: () => Promise<void>) => {
  if (!enabled()) return;
  try {
    effect().catch(() => undefined);
  } catch {
    // Not available on this platform.
  }
};

/**
 * One-off feedback of the same kind closer together than this is felt once: rapid taps (flicking through
 * activities, a double-tapped button) never turn into a buzz. Choreographed beats (sequence, ramp) are
 * timed on purpose and are never merged.
 */
export const HAPTIC_MIN_GAP_MS = 60;
const lastFired = new Map<string, number>();
const once = (kind: string, effect: () => Promise<void>) => {
  const now = Date.now();
  const last = lastFired.get(kind);
  if (last !== undefined && now - last < HAPTIC_MIN_GAP_MS) return;
  lastFired.set(kind, now);
  fire(effect);
};

const impact = (style: Haptics.ImpactFeedbackStyle) => fire(() => Haptics.impactAsync(style));
const notify = (type: Haptics.NotificationFeedbackType) => () => Haptics.notificationAsync(type);

/** How hard a charging tick lands as the charge builds (0…1): light, then medium, then heavy. */
function chargeStyle(progress: number): Haptics.ImpactFeedbackStyle {
  if (progress < 0.4) return Haptics.ImpactFeedbackStyle.Light;
  if (progress < 0.75) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

export type ImpactStrength = 'light' | 'medium' | 'heavy';
const STRENGTH: Record<ImpactStrength, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/** One beat of a haptic sequence: how hard, and when (ms from the sequence's start). */
export interface HapticBeat {
  atMs: number;
  strength: ImpactStrength;
}

export interface HapticRamp {
  /** How long the charge takes to fill (ms). */
  durationMs: number;
  /** The gap between ticks at the start and at the end (ms): smaller = faster. */
  gapMs: { from: number; to: number };
}

export const haptics = {
  /** A light tap: a primary control pressed (the + button), an Undo done. */
  light: () => once('light', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A firmer tap: a long press recognised. */
  medium: () => once('medium', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A gentle, cushioned bump: used when the page or tab changes. */
  soft: () => once('soft', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** A choice changed (a tile, a toggle, a segment, a day). Only for real changes, never re-selection. */
  selection: () => once('selection', () => Haptics.selectionAsync()),
  /** Something was saved or completed. Only after it actually succeeded. */
  success: () => once('success', notify(Haptics.NotificationFeedbackType.Success)),
  /** About to do something that can't be undone (a destructive confirmation). */
  warning: () => once('warning', notify(Haptics.NotificationFeedbackType.Warning)),
  /** Something the person asked for failed (not for ordinary validation messages). */
  error: () => once('error', notify(Haptics.NotificationFeedbackType.Error)),
  /** One impact at a chosen strength (choreographed beats: never merged). */
  impact: (strength: ImpactStrength) => impact(STRENGTH[strength]),
  /**
   * Impacts at set times, e.g. in step with an animation and its sound. Returns `stop`, which cancels the
   * beats still to come (for leaving the screen, or a new sequence taking over).
   */
  sequence: (beats: readonly HapticBeat[]): (() => void) => {
    const timers = beats.map(({ atMs, strength }) => setTimeout(() => haptics.impact(strength), atMs));
    return () => timers.forEach(clearTimeout);
  },
  /** One tick of a charge, as strong as the charge is full (0…1). */
  charge: (progress: number) => impact(chargeStyle(progress)),
  /**
   * A charge you can feel (press and hold): ticks that come faster and land harder as it fills, like
   * something winding up. Starts with a tick at once (so a tap is felt too). Returns `stop`, for letting
   * go early or leaving the screen; it stops by itself once the charge is full.
   */
  ramp: ({ durationMs, gapMs }: HapticRamp): (() => void) => {
    let elapsed = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const progress = Math.min(1, elapsed / durationMs);
      haptics.charge(progress);
      const gap = gapMs.from + (gapMs.to - gapMs.from) * progress;
      elapsed += gap;
      if (elapsed < durationMs) timer = setTimeout(tick, gap);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },
};
