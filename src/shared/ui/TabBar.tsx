import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import type { TabId, TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  /** The bar's size once laid out (its tabs share its width evenly; see `tabCenters`, `TAB_ICON_Y`). */
  onMeasure?: (size: { width: number; height: number }) => void;
}

const TAB_ICON = 24;
/** The active tab's well: wide enough for the longest label, its corners those of a large key. */
const WELL_WIDTH = 92;
const WELL_RADIUS = 16;
const WELL_HEIGHT = 56;
/** Narrow space either side of the well on a cramped screen, echoing the old per-tab `maxWidth: '100%'`. */
const WELL_GUTTER = 8;
/**
 * How far below the bar's top edge each tab's icon is centred: the bar's top padding (8), the well's (4),
 * then the icon, label and gap centred in the well (1 to spare), and half the icon.
 */
export const TAB_ICON_Y = 8 + 4 + 1 + TAB_ICON / 2;

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
export function TabBar({ items, active, onTabPress, onMeasure }: TabBarProps) {
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
    <View
      testID="tab-bar"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setBarWidth(width);
        onMeasure?.({ width, height });
      }}
    >
      {barWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          testID="tab-liquid"
          style={[styles.liquid, { width: wellWidth }, liquidStyle]}
        />
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
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
