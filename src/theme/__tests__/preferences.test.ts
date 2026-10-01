import { act } from '@testing-library/react-native';

import { useThemePreferencesStore } from '../state/themePreferencesStore';

const KEY = 'teras.theme-preferences';

describe('appearance preferences', () => {
  it('keeps theme and Reduce Motion independent: changing one never touches the other', () => {
    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    act(() => useThemePreferencesStore.getState().setPreference('dark'));
    expect(useThemePreferencesStore.getState()).toMatchObject({ preference: 'dark', reduceMotion: 'on' });

    act(() => useThemePreferencesStore.getState().setPreference('system'));
    act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
    // "System" is stored as the choice itself, never as the light/dark it resolves to.
    expect(useThemePreferencesStore.getState()).toMatchObject({ preference: 'system', reduceMotion: 'off' });
  });

  it('restores both choices on the next launch, and fills in defaults for older saved data', () => {
    jest.isolateModules(() => {
      const { Storage } = require('expo-sqlite/kv-store');
      Storage.setItemSync(
        KEY,
        JSON.stringify({
          state: { preference: 'system', paletteId: 'ocean', style: 'classic', reduceMotion: 'on' },
          version: 1,
        }),
      );
      const { useThemePreferencesStore: relaunched } = require('../state/themePreferencesStore');
      expect(relaunched.getState()).toMatchObject({
        preference: 'system',
        paletteId: 'ocean',
        reduceMotion: 'on',
      });
    });

    jest.isolateModules(() => {
      const { Storage } = require('expo-sqlite/kv-store');
      // Saved before Reduce Motion existed.
      Storage.setItemSync(
        KEY,
        JSON.stringify({ state: { preference: 'dark', paletteId: 'meadow', style: 'glass' }, version: 1 }),
      );
      const { useThemePreferencesStore: relaunched } = require('../state/themePreferencesStore');
      expect(relaunched.getState()).toMatchObject({ preference: 'dark', reduceMotion: 'system' });
    });
  });
});
