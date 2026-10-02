import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/shared/lib/haptics';

import type { TabId, TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
}

const TAB_ICON = 24;

/**
 * The app's one navigation bar: sections only, in the same place on every tab screen. The active tab is
 * marked by its filled pill and bolder label as well as its colour, so colour is never the only signal.
 * Only a real change of tab is felt (a selection tick); tapping the tab you are on is silent.
 */
export function TabBar({ items, active, onTabPress }: TabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
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
            <View style={styles.pill(on)}>
              <Icon
                name={item.icon}
                size={TAB_ICON}
                color={on ? theme.colors.accentText : theme.colors.text2}
              />
            </View>
            <Text variant="mini" weight={on ? 'semibold' : 'medium'} tone={on ? 'accent' : 'secondary'}>
              {item.label}
            </Text>
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
  tab: { flex: 1, alignItems: 'center', gap: theme.spacing.xs, minHeight: 48 },
  pill: (on: boolean) => ({
    width: 64,
    height: 32,
    borderRadius: theme.radii.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    // The tab you are on is pressed into the bar, gold-tinted; with its gold icon and bolder label it
    // reads as chosen even where inset shadows do not draw.
    backgroundColor: on ? theme.colors.accentSoft : 'transparent',
    boxShadow: on ? theme.material.pressed.shadow : undefined,
  }),
}));
