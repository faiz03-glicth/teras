import { useColorScheme } from 'react-native';

import type { ColorScheme, ThemePreference } from '../types';

type SystemScheme = ReturnType<typeof useColorScheme> | null | undefined;

/** PURE: 'system' follows the OS; anything the OS can't tell us falls back to light. */
export function resolveScheme(preference: ThemePreference, system: SystemScheme): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** Resolution only: turns the stored preference into the scheme to render. */
export function useResolvedScheme(preference: ThemePreference): ColorScheme {
  return resolveScheme(preference, useColorScheme());
}
