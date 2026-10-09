import { readFileSync } from 'fs';

/**
 * patches/expo-router+*.patch: expo-router's tab view never detached the tabs left of the focused one
 * (they rest at -1, and the activity interpolation extended its "visible" value past 0). On Profile, Home
 * and Workout stayed attached behind it, Home's training wave included, and were redrawn on every return
 * from a pushed screen. This fails if an expo-router upgrade drops the patch.
 */
it('the tab view detaches tabs on both sides of the focused one (patch-package)', () => {
  const source = readFileSync(
    require.resolve('expo-router/build/react-navigation/bottom-tabs/views/BottomTabView.js'),
    'utf8',
  );
  expect(source).toContain('inputRange: [-1, -1 + EPSILON, 1 - EPSILON, 1]');
  expect(source).not.toContain('inputRange: [0, 1 - EPSILON, 1]');
});
