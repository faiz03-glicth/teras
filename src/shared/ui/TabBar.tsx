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
/** The active tab's well: wide enough for the longest label, its corners those of a large key. */
const WELL_WIDTH = 92;
const WELL_RADIUS = 16;

/**
 * The app's one navigation bar: sections only, in the same place on every tab screen. The active tab is
 * marked by its well and bolder label as well as its colour, so colour is never the only signal.
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
            {({ pressed }) => (
              // Pressed, another tab's well sinks into the bar under the finger (the whole tab is the target);
              // the tab you are on already sits in its well.
              <View
                style={[styles.well(on), pressed && !on && styles.wellPressed]}
                testID={`tab-${item.id}-well`}
              >
                <Icon
                  name={item.icon}
                  size={TAB_ICON}
                  color={on ? theme.colors.accentText : theme.colors.text2}
                />
                <Text variant="mini" weight={on ? 'semibold' : 'medium'} tone={on ? 'accent' : 'secondary'}>
                  {item.label}
                </Text>
              </View>
            )}
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
  tab: { flex: 1, alignItems: 'center' },
  well: (on: boolean) => ({
    width: WELL_WIDTH,
    maxWidth: '100%' as const,
    minHeight: 56,
    paddingTop: theme.spacing.xs,
    paddingBottom: 6,
    borderRadius: WELL_RADIUS,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.xs,
    // The tab you are on sits in a well pressed into the bar, icon and label together. Its darker fill,
    // gold icon and bolder label mark it even where inset shadows do not draw.
    backgroundColor: on ? theme.material.inset.background : 'transparent',
    boxShadow: on ? theme.material.inset.shadow : undefined,
  }),
  wellPressed: { backgroundColor: theme.material.inset.background, boxShadow: theme.material.pressed.shadow },
}));
