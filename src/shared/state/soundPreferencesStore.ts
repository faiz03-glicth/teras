import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

interface SoundPreferences {
  /** Short interface sounds (e.g. the logo flipping). On by default; the phone's silent mode still applies. */
  soundEffects: boolean;
}

interface SoundPreferencesState extends SoundPreferences {
  setSoundEffects: (on: boolean) => void;
}

/**
 * State only: the person's sound choice, persisted. The sounds service reads it before every play, so no
 * caller ever checks it; Settings changes it.
 */
export const useSoundPreferencesStore = create<SoundPreferencesState>()(
  persist(
    (set) => ({
      soundEffects: true,
      setSoundEffects: (soundEffects) => set({ soundEffects }),
    }),
    {
      name: 'teras.sound-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ soundEffects }): SoundPreferences => ({ soundEffects }),
    },
  ),
);
