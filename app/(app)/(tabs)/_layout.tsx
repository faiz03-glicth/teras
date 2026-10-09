import { Tabs } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { goTab } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS, type TabId } from '@/shared/config/tabs';
import { TAB_ICON_Y, TabBar, tabCenters, TabMotionProvider, TabScene } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

const NO_TAB_BAR = () => null;

interface Size {
  width: number;
  height: number;
}
const NO_SIZE: Size = { width: 0, height: 0 };
const sameSize = (a: Size, b: Size) => a.width === b.width && a.height === b.height;

/** Each page squirts out of its own tab's icon (TabScene); the navigator only swaps them. */
const screenLayout = ({ route, children }: { route: { name: string }; children: ReactNode }) => (
  <TabScene tab={tabForRouteName(route.name)}>{children}</TabScene>
);

/**
 * Home, Workout and Profile, with the app's own tab bar drawn over the navigator's pages. A tap on a tab
 * chooses it at once, so the bar's liquid and the page's growth start with the tap rather than after the
 * navigator has caught up; a tab reached any other way (Back, a link) is chosen when its page gains focus.
 */
export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  const [tabs, setTabs] = useState<{ active: TabId; switched: boolean }>({
    active: 'home',
    switched: false,
  });
  const [frame, setFrame] = useState(NO_SIZE);
  const [bar, setBar] = useState(NO_SIZE);

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

  // Where each tab's icon sits over the pages: the bar spans their width along their bottom edge.
  const origins = useMemo(() => {
    if (frame.height <= 0 || bar.width <= 0) return {};
    const centres = tabCenters(TAB_ITEMS.length, bar.width);
    const y = frame.height - bar.height + TAB_ICON_Y;
    return Object.fromEntries(TAB_ITEMS.map((item, index) => [item.id, { x: centres[index] ?? 0, y }]));
  }, [bar, frame]);
  const motionValue = useMemo(() => ({ ...tabs, origins }), [origins, tabs]);

  const onFrame = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame((current) => (sameSize(current, { width, height }) ? current : { width, height }));
  }, []);
  const onBar = useCallback(
    (size: Size) => setBar((current) => (sameSize(current, size) ? current : size)),
    [],
  );

  return (
    <View style={styles.root} onLayout={onFrame}>
      <TabMotionProvider value={motionValue}>
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
      <TabBar items={TAB_ITEMS} active={tabs.active} onTabPress={onTabPress} onMeasure={onBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
