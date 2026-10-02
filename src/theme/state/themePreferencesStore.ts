import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import type { HeatPaletteId, ReduceMotionPreference, ThemePreference } from '../types';

interface ThemePreferences {
  preference: ThemePreference;
  paletteId: HeatPaletteId;
  reduceMotion: ReduceMotionPreference;
}

interface ThemePreferencesState extends ThemePreferences {
  setPreference: (preference: ThemePreference) => void;
  setPaletteId: (paletteId: HeatPaletteId) => void;
  setReduceMotion: (reduceMotion: ReduceMotionPreference) => void;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  preference: 'system',
  paletteId: 'amber',
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
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    {
      name: 'teras.theme-preferences',
      version: 1,
      storage: persistStorage,
      // A `style` saved by an older build is simply ignored: Teras has one material.
      partialize: ({ preference, paletteId, reduceMotion }): ThemePreferences => ({
        preference,
        paletteId,
        reduceMotion,
      }),
    },
  ),
);
