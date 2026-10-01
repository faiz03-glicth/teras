import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import type { HeatPaletteId, ReduceMotionPreference, ThemePreference, VisualStyle } from '../types';

interface ThemePreferences {
  preference: ThemePreference;
  paletteId: HeatPaletteId;
  style: VisualStyle;
  reduceMotion: ReduceMotionPreference;
}

interface ThemePreferencesState extends ThemePreferences {
  setPreference: (preference: ThemePreference) => void;
  setPaletteId: (paletteId: HeatPaletteId) => void;
  setStyle: (style: VisualStyle) => void;
  setReduceMotion: (reduceMotion: ReduceMotionPreference) => void;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  preference: 'system',
  paletteId: 'amber',
  // Teras draws flat parchment and walnut surfaces; the glass material is not used.
  style: 'classic',
  reduceMotion: 'system',
};

/**
 * State only: persisted appearance choices. Resolution and side effects live elsewhere.
 * Fields added later (like reduceMotion) need no migration: persisted state is merged over these defaults.
 */
export const useThemePreferencesStore = create<ThemePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_THEME_PREFERENCES,
      setPreference: (preference) => set({ preference }),
      setPaletteId: (paletteId) => set({ paletteId }),
      setStyle: (style) => set({ style }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    {
      name: 'teras.theme-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ preference, paletteId, style, reduceMotion }): ThemePreferences => ({
        preference,
        paletteId,
        style,
        reduceMotion,
      }),
    },
  ),
);
