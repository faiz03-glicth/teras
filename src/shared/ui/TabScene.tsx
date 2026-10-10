import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabId } from '../config/tabs';

export interface TabMotion {
  /** The tab chosen now. */
  active: TabId;
  /** A tab has been chosen since the tabs opened. Until then the first page is simply there. */
  switched: boolean;
}

const TabMotionContext = createContext<TabMotion>({ active: 'home', switched: false });

/** What every TabScene reads: given by the tabs' layout, which knows the tab chosen. */
export const TabMotionProvider = TabMotionContext.Provider;

const { timing } = motion.tabFade;

/**
 * A tab's page. When its tab is chosen it fades in where it is, on the UI thread (opacity only, so nothing
 * is laid out or drawn again while it plays). The page it replaces was put away at once (the navigator only
 * swaps pages), so two pages are never drawn together and never stack, however fast tabs are tapped: a page
 * left mid-fade is put away too. Coming back to a tab from a screen pushed over it chooses no tab, so
 * nothing plays.
 */
export function TabScene({ tab, children }: { tab: TabId; children: ReactNode }) {
  const { active, switched } = useContext(TabMotionContext);
  // 0: put away, out of sight; 1: the whole page.
  const shown = useSharedValue(active === tab && !switched ? 1 : 0);

  useLayoutEffect(() => {
    if (active !== tab) {
      cancelAnimation(shown);
      shown.set(0);
      return;
    }
    if (shown.get() < 1) shown.set(withTiming(1, timing));
  }, [active, shown, tab]);

  const style = useAnimatedStyle(() => ({ opacity: shown.get() }));

  return (
    <Animated.View style={[styles.page, style]} testID={`tab-scene-${tab}`}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
