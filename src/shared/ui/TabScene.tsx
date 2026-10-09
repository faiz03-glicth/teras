import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion, useReduceMotion } from '@/theme';

import type { TabId } from '../config/tabs';

export interface TabMotion {
  /** The tab chosen now. */
  active: TabId;
  /** A tab has been chosen since the tabs opened. Until then the first page is simply there. */
  switched: boolean;
  /** Where each tab's icon is, in the pages' coordinates (the tab bar lies over the pages' bottom). */
  origins: Partial<Record<TabId, { x: number; y: number }>>;
}

const TabMotionContext = createContext<TabMotion>({ active: 'home', switched: false, origins: {} });

/** What every TabScene reads: given by the tabs' layout, which knows the tab chosen and the bar. */
export const TabMotionProvider = TabMotionContext.Provider;

const { durationMs, fromScale, fadeInAt, fade } = motion.tabSquirt;
const squirt = motion.timing(durationMs, 'emphasis');

/**
 * A tab's page. When its tab is chosen it squirts out of the tab's icon: from a speck the icon's size to
 * the whole screen, on the UI thread (scale and opacity only, so nothing is laid out while it grows).
 * The page it replaces was put away at once (the navigator only swaps pages), so pages never stack,
 * however fast tabs are tapped: a page left mid-growth is put away too. Coming back to a tab from a
 * screen pushed over it chooses no tab, so nothing plays. With Reduce Motion the page fades in, in place.
 */
export function TabScene({ tab, children }: { tab: TabId; children: ReactNode }) {
  const { active, switched, origins } = useContext(TabMotionContext);
  const reduced = useReduceMotion();
  // 0: tucked into the tab's icon, out of sight; 1: the whole page.
  const shown = useSharedValue(active === tab && !switched ? 1 : 0);
  const origin = origins[tab];

  useLayoutEffect(() => {
    if (active !== tab) {
      cancelAnimation(shown);
      shown.set(0);
      return;
    }
    if (shown.get() < 1) shown.set(withTiming(1, reduced ? fade : squirt));
  }, [active, reduced, shown, tab]);

  const style = useAnimatedStyle(() => {
    const progress = shown.get();
    if (reduced) return { opacity: progress, transform: [{ scale: 1 }] };
    return {
      opacity: Math.min(1, progress / fadeInAt),
      transformOrigin: origin ? [origin.x, origin.y, 0] : ['50%', '100%', 0],
      transform: [{ scale: fromScale + (1 - fromScale) * progress }],
    };
  });

  return (
    <Animated.View style={[styles.page, style]} testID={`tab-scene-${tab}`}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
