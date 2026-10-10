import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { TabId } from '@/shared/config/tabs';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';
import { motion } from '@/theme/tokens/motion';

import { TabMotionProvider, TabScene } from '../TabScene';

const { duration } = motion.tabFade.timing;

function tabs(active: TabId, switched = true) {
  return (
    <TabMotionProvider value={{ active, switched }}>
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
const settle = () => act(() => jest.advanceTimersByTime(duration + 100));

beforeEach(() => {
  jest.useFakeTimers();
  act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
});

afterEach(() => jest.useRealTimers());

it('shows the tab the app opens on as it is: nothing plays', () => {
  render(tabs('home', false));

  expect(page('home')).toHaveAnimatedStyle({ opacity: 1 });
});

it("fades a chosen tab's page in where it is, with nothing scaled or moved", () => {
  const view = render(tabs('home', false));

  view.rerender(tabs('profile'));

  expect(page('profile')).toHaveAnimatedStyle({ opacity: 0 });
  settle();
  expect(page('profile')).toHaveAnimatedStyle({ opacity: 1 });
  expect(page('profile').props.style).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ transform: expect.anything() })]),
  );
});

it('puts a page away at once when another tab is chosen, so pages never stack however fast the taps', () => {
  const view = render(tabs('home', false));
  view.rerender(tabs('workout'));
  act(() => jest.advanceTimersByTime(duration / 4));

  view.rerender(tabs('profile'));

  expect(page('home')).toHaveAnimatedStyle({ opacity: 0 });
  expect(page('workout')).toHaveAnimatedStyle({ opacity: 0 });
  settle();
  expect(page('profile')).toHaveAnimatedStyle({ opacity: 1 });
});

it('plays nothing on coming back to a tab from a screen pushed over it (the tab never changed)', () => {
  const view = render(tabs('home', false));
  view.rerender(tabs('workout'));
  settle();

  view.rerender(tabs('workout'));

  expect(page('workout')).toHaveAnimatedStyle({ opacity: 1 });
});

it('fades the same with Reduce Motion: opacity only, nothing that moves', () => {
  act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
  const view = render(tabs('home', false));

  view.rerender(tabs('workout'));

  expect(page('workout')).toHaveAnimatedStyle({ opacity: 0 });
  settle();
  expect(page('workout')).toHaveAnimatedStyle({ opacity: 1 });
});
