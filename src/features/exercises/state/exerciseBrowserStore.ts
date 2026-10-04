import { create } from 'zustand';

import type { Equipment, Muscle } from '@/core/db/schema';

interface ExerciseBrowserState {
  query: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
  setQuery: (query: string) => void;
  setMuscle: (muscle: Muscle | null) => void;
  setEquipment: (equipment: Equipment | null) => void;
  /** Takes the muscle and equipment filters off, keeping the search. */
  clearFilters: () => void;
  /** Back to the whole library: no search, no filters. */
  clear: () => void;
  /** Finds a just-created exercise: searched for by name, with no filter hiding it. */
  showCreated: (name: string) => void;
}

const FRESH = { query: '', muscle: null, equipment: null } as const;

/**
 * UI state only, never saved: the exercise browser's search and filters. A store rather than the
 * screen's own state because the equipment and Create sheets are screens of their own that change it, as
 * the prototype's sheets do. The browser starts afresh each time it opens.
 */
export const useExerciseBrowserStore = create<ExerciseBrowserState>()((set) => ({
  ...FRESH,
  setQuery: (query) => set({ query }),
  setMuscle: (muscle) => set({ muscle }),
  setEquipment: (equipment) => set({ equipment }),
  clearFilters: () => set({ muscle: null, equipment: null }),
  clear: () => set(FRESH),
  showCreated: (name) => set({ ...FRESH, query: name }),
}));
