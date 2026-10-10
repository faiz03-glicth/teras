import { Tabs } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { goTab } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS, type TabId } from '@/shared/config/tabs';
import { TabBar, TabMotionProvider, TabScene } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

const NO_TAB_BAR = () => null;

/** Each page fades itself in when its tab is chosen (TabScene); the navigator only swaps them. */
const screenLayout = ({ route, children }: { route: { name: string }; children: ReactNode }) => (
  <TabScene tab={tabForRouteName(route.name)}>{children}</TabScene>
);

/**
 * Home, Workout and Profile, with the app's own tab bar drawn over the navigator's pages. A tap on a tab
 * chooses it at once, so the bar's liquid and the page's fade start with the tap rather than after the
 * navigator has caught up; a tab reached any other way (Back, a link) is chosen when its page gains focus.
 */
export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  const [tabs, setTabs] = useState<{ active: TabId; switched: boolean }>({
    active: 'home',
    switched: false,
  });

  const select = useCallback(
    (tab: TabId) =>
      setTabs((current) => (current.active === tab ? current : { active: tab, switched: true })),
    [],
  );
  const onTabPress = useCallback(
    (tab: TabId) => {
      select(tab);
      goTab(tab);
    },
    [select],
  );
  const screenListeners = useCallback(
    ({ route }: { route: { name: string } }) => ({ focus: () => select(tabForRouteName(route.name)) }),
    [select],
  );
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: transitions.tabs,
      sceneStyle: { backgroundColor: theme.colors.canvas },
    }),
    [theme.colors.canvas, transitions.tabs],
  );

  return (
    <View style={styles.root}>
      <TabMotionProvider value={tabs}>
        <Tabs
          screenOptions={screenOptions}
          screenListeners={screenListeners}
          screenLayout={screenLayout}
          tabBar={NO_TAB_BAR}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="workout" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </TabMotionProvider>
      <TabBar items={TAB_ITEMS} active={tabs.active} onTabPress={onTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
