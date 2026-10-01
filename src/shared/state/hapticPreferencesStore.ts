import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

interface HapticPreferences {
  /** Taps and confirmations you can feel. On by default; separate from Reduce Motion (a visual setting). */
  haptics: boolean;
}

interface HapticPreferencesState extends HapticPreferences {
  setHaptics: (on: boolean) => void;
}

/** State only: the person's haptics choice, persisted. The haptics service reads it before every tap. */
export const useHapticPreferencesStore = create<HapticPreferencesState>()(
  persist(
    (set) => ({
      haptics: true,
      setHaptics: (haptics) => set({ haptics }),
    }),
    {
      name: 'teras.haptic-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ haptics }): HapticPreferences => ({ haptics }),
    },
  ),
);
