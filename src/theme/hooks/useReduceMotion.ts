import { useReducedMotion } from 'react-native-reanimated';

import { useSystemMotionStore } from '../state/systemMotionStore';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import type { ReduceMotionPreference } from '../types';

/** PURE: 'system' follows the phone; 'on'/'off' are the person's override for this app. */
export function resolveReduceMotion(preference: ReduceMotionPreference, system: boolean): boolean {
  return preference === 'system' ? system : preference === 'on';
}

/**
 * The phone's Reduce Motion setting, live. Reanimated reads it synchronously at launch (so the very first
 * frame is right); the OS then keeps it current through MotionRuntimeBridge.
 */
export function useSystemReduceMotion(): boolean {
  const atLaunch = useReducedMotion();
  const live = useSystemMotionStore((s) => s.reduceMotion);
  return live ?? atLaunch;
}

/** Whether decorative motion (stretch, bounce, staggered entrances) should be skipped right now. */
export function useReduceMotion(): boolean {
  const preference = useThemePreferencesStore((s) => s.reduceMotion);
  return resolveReduceMotion(preference, useSystemReduceMotion());
}
