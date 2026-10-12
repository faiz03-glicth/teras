import { useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import type { TabId, TabItem } from '../config/tabs';
import { CachedSurface } from './CachedSurface';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  /** Docked just above the bar, on every tab (the workout in progress: Resume). */
  accessory?: ReactNode;
}

const TAB_ICON = 24;
/** The active tab's well: wide enough for the longest label, its corners those of a large key. */
const WELL_WIDTH = 92;
const WELL_RADIUS = 16;
const WELL_HEIGHT = 56;
/** Narrow space either side of the well on a cramped screen, echoing the old per-tab `maxWidth: '100%'`. */
const WELL_GUTTER = 8;

/** Every tab's centre, evenly dividing the bar's measured width (one segment per tab). */
export function tabCenters(count: number, width: number): number[] {
  if (count <= 0 || width <= 0) return [];
  const segment = width / count;
  return Array.from({ length: count }, (_, index) => segment * (index + 0.5));
}

/**
 * The app's one navigation bar: sections only, in the same place on every tab screen. A single liquid
 * well slides and stretches to the tab you choose (leading and trailing springs, so the body elongates
 * while it travels and gathers back into one pill once it stops) — the icon and bolder label still carry
 * which tab that is, so colour is never the only signal. Only a real change of tab is felt (a selection
 * tick); tapping the tab you are on is silent.
 */
export function TabBar({ items, active, onTabPress, accessory }: TabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === active),
  );

  const headX = useSharedValue(0);
  const tailX = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (barWidth <= 0) return;
    const target = tabCenters(items.length, barWidth)[activeIndex] ?? 0;
    if (!placed.get()) {
      // First layout: sit the well under the active tab rather than sliding in from nowhere.
      headX.set(target);
      tailX.set(target);
      placed.set(true);
      return;
    }
    headX.set(withSpring(target, motion.liquid.head));
    tailX.set(withSpring(target, motion.liquid.tail));
  }, [activeIndex, barWidth, headX, items.length, placed, tailX]);

  const wellWidth = Math.max(0, Math.min(WELL_WIDTH, barWidth / Math.max(1, items.length) - WELL_GUTTER));
  // The pill's own layout width never changes — only its transform does. A `width` driven every
  // spring frame forces Android to relayout (not just recomposite) each frame, which is what was
  // making this stutter; translateX/scaleX stay on the compositor instead.
  const liquidStyle = useAnimatedStyle(() => {
    const half = wellWidth / 2;
    const left = Math.min(headX.get(), tailX.get()) - half;
    const right = Math.max(headX.get(), tailX.get()) + half;
    const center = (left + right) / 2;
    const span = Math.max(0, right - left);
    const scaleX = wellWidth > 0 ? span / wellWidth : 0;
    return { transform: [{ translateX: center - wellWidth / 2 }, { scaleX }] };
  });

  return (
    <View style={styles.dock} pointerEvents="box-none">
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      <View
        testID="tab-bar"
        style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}
        onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            testID="tab-liquid"
            style={[styles.liquid, { width: wellWidth }, liquidStyle]}
          >
            <CachedSurface style={styles.liquidSurface} bleed="none" />
          </Animated.View>
        )}
        {items.map((item) => {
          const on = item.id === active;
          return (
            <PressableScale
              key={item.id}
              onPress={() => {
                if (!on) haptics.selection();
                onTabPress(item.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={item.label}
              style={styles.tab}
              testID={`tab-${item.id}`}
            >
              <View style={styles.well} testID={`tab-${item.id}-well`}>
                <Icon
                  name={item.icon}
                  size={TAB_ICON}
                  color={on ? theme.colors.accentText : theme.colors.text2}
                />
                <Text variant="mini" weight={on ? 'semibold' : 'medium'} tone={on ? 'accent' : 'secondary'}>
                  {item.label}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The bar and whatever docks above it, pinned to the bottom together; touches between them fall through.
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  accessory: { paddingHorizontal: 12, paddingBottom: 10 },
  bar: {
    flexDirection: 'row',
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.material.bar.background,
    boxShadow: theme.material.bar.shadow,
  },
  // The one moving well: it alone carries the pressed-in fill and shadow now, sliding under whichever
  // tab is active instead of each tab showing and hiding its own.
  liquid: {
    position: 'absolute',
    top: theme.spacing.sm,
    height: WELL_HEIGHT,
  },
  // Drawn once into a texture (CachedSurface) that the well's springs only move and stretch. Android blurs
  // an inner shadow offscreen on every frame it is drawn, and the bar is drawn on every frame of a tab
  // change, a push and a pop, and under every scroll.
  liquidSurface: {
    borderRadius: WELL_RADIUS,
    backgroundColor: theme.material.inset.background,
    boxShadow: theme.material.inset.shadow,
  },
  tab: { flex: 1, alignItems: 'center' },
  well: {
    width: WELL_WIDTH,
    maxWidth: '100%' as const,
    minHeight: WELL_HEIGHT,
    paddingTop: theme.spacing.xs,
    paddingBottom: 6,
    borderRadius: WELL_RADIUS,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.xs,
  },
}));
