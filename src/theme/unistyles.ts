import { Appearance } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { buildTheme } from './buildTheme';
import { resolveScheme } from './hooks/useResolvedScheme';
import { useThemePreferencesStore } from './state/themePreferencesStore';
import type { Theme } from './types';

// Wiring only: registers the two scheme themes built from the persisted (synchronously hydrated) preferences.
// ThemeRuntimeBridge keeps them current afterwards.
const initial = useThemePreferencesStore.getState();

const appThemes = {
  light: buildTheme('light', initial.paletteId, initial.style),
  dark: buildTheme('dark', initial.paletteId, initial.style),
};

const breakpoints = { xs: 0, md: 600 } as const;

type AppThemes = { light: Theme; dark: Theme };
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: {
    initialTheme: () => resolveScheme(initial.preference, Appearance.getColorScheme()),
  },
});
