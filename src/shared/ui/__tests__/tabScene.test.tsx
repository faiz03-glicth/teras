import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { TabId } from '@/shared/config/tabs';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';
import { motion } from '@/theme/tokens/motion';

import { TabMotionProvider, TabScene } from '../TabScene';

const ORIGINS = {
  home: { x: 66, y: 806 },
  workout: { x: 196, y: 806 },
  profile: { x: 326, y: 806 },
};
const { durationMs, fromScale } = motion.tabSquirt;

function tabs(active: TabId, switched = true) {
  return (
    <TabMotionProvider value={{ active, switched, origins: ORIGINS }}>
      <TabScene tab="home">
        <Text>Home</Text>
      </TabScene>
      <TabScene tab="workout">
        <Text>Workout</Text>
      </TabScene>
      <TabScene tab="profile">
        <Text>Profile</Text>
      </TabScene>
    </TabMotionProvider>
  );
}

const page = (tab: TabId) => screen.getByTestId(`tab-scene-${tab}`);
const settle = () => act(() => jest.advanceTimersByTime(durationMs + 100));

beforeEach(() => {
  jest.useFakeTimers();
  act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
});

afterEach(() => jest.useRealTimers());

it('shows the tab the app opens on as it is: nothing grows', () => {
  render(tabs('home', false));

  expect(page('home')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
});

it("squirts a chosen tab's page out of that tab's icon, from a speck to the whole screen", () => {
  const view = render(tabs('home', false));

  view.rerender(tabs('profile'));

  expect(page('profile')).toHaveAnimatedStyle({
    opacity: 0,
    transformOrigin: [ORIGINS.profile.x, ORIGINS.profile.y, 0],
    transform: [{ scale: fromScale }],
  });
  settle();
  expect(page('profile')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
});

it('puts a page away at once when another tab is chosen, so pages never stack however fast the taps', () => {
  const view = render(tabs('home', false));
  view.rerender(tabs('workout'));
  act(() => jest.advanceTimersByTime(durationMs / 4));

  view.rerender(tabs('profile'));

  expect(page('home')).toHaveAnimatedStyle({ opacity: 0 });
  expect(page('workout')).toHaveAnimatedStyle({ opacity: 0, transform: [{ scale: fromScale }] });
  settle();
  expect(page('profile')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
});

it('plays nothing on coming back to a tab from a screen pushed over it (the tab never changed)', () => {
  const view = render(tabs('home', false));
  view.rerender(tabs('workout'));
  settle();

  view.rerender(tabs('workout'));

  expect(page('workout')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
});

it('only fades the page in, in place, with Reduce Motion', () => {
  act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
  const view = render(tabs('home', false));

  view.rerender(tabs('workout'));

  expect(page('workout')).toHaveAnimatedStyle({ opacity: 0, transform: [{ scale: 1 }] });
  settle();
  expect(page('workout')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
});
