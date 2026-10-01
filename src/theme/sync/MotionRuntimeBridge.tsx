import { useEffect } from 'react';
import { AccessibilityInfo, AppState, LogBox } from 'react-native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { useSystemMotionStore } from '../state/systemMotionStore';

// Reanimated notes (dev only) that the app overrides the system value. Overriding it is the point here.
LogBox.ignoreLogs(['Reduced motion setting is overwritten']);

/**
 * Side effect only:
 * - keeps the phone's Reduce Motion setting current (live change events, plus a re-check when the app
 *   returns to the foreground in case it was changed in Settings meanwhile);
 * - applies the app's resolved choice to Reanimated, so every animation configured with
 *   `ReduceMotion.System` (all of `motion.*`) follows the in-app setting, not just the phone's.
 */
export function MotionRuntimeBridge() {
  const reduced = useReduceMotion();

  useEffect(() => {
    const { setReduceMotion } = useSystemMotionStore.getState();
    let active = true;
    const refresh = () => {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (active) setReduceMotion(enabled);
        })
        // Keeps the value Reanimated read at launch.
        .catch(() => undefined);
    };

    refresh();
    const changed = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const resumed = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      changed.remove();
      resumed.remove();
    };
  }, []);

  return <ReducedMotionConfig mode={reduced ? ReduceMotion.Always : ReduceMotion.Never} />;
}
