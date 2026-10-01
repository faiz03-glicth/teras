import { Tabs } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { goTab } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS, type TabId } from '@/shared/config/tabs';
import { TabBar } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

const NO_TAB_BAR = () => null;

/**
 * Home, Workout and Profile, with the app's own tab bar drawn beside the navigator. Which tab is active
 * still comes from navigation: each tab screen reports when it gains focus.
 */
export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  const [active, setActive] = useState<TabId>('home');
  const screenListeners = useCallback(
    ({ route }: { route: { name: string } }) => ({ focus: () => setActive(tabForRouteName(route.name)) }),
    [],
  );

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: transitions.tabs,
          sceneStyle: { backgroundColor: theme.colors.canvas },
        }}
        screenListeners={screenListeners}
        tabBar={NO_TAB_BAR}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="workout" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <TabBar items={TAB_ITEMS} active={active} onTabPress={goTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
