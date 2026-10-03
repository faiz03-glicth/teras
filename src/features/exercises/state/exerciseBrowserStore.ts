import { create } from 'zustand';

import type { Equipment, Muscle } from '@/core/db/schema';
import { BROWSER_PAGE } from '@/features/exercises/domain/browse';

interface ExerciseBrowserState {
  query: string;
  muscle: Muscle | null;
  equipment: Equipment | null;
  /** How much of the full list is showing; "Show more" adds a page, and any new search starts over. */
  shown: number;
  setQuery: (query: string) => void;
  setMuscle: (muscle: Muscle | null) => void;
  setEquipment: (equipment: Equipment | null) => void;
  showMore: () => void;
  /** Takes the muscle and equipment filters off, keeping the search. */
  clearFilters: () => void;
  /** Back to the whole library: no search, no filters. */
  clear: () => void;
  /** Finds a just-created exercise: searched for by name, with no filter hiding it. */
  showCreated: (name: string) => void;
}

const FRESH = { query: '', muscle: null, equipment: null, shown: BROWSER_PAGE } as const;

/**
 * UI state only, never saved: the exercise browser's search and filters. A store rather than the
 * screen's own state because the equipment and Create sheets are screens of their own that change it, as
 * the prototype's sheets do. The browser starts afresh each time it opens.
 */
export const useExerciseBrowserStore = create<ExerciseBrowserState>()((set) => ({
  ...FRESH,
  setQuery: (query) => set({ query, shown: BROWSER_PAGE }),
  setMuscle: (muscle) => set({ muscle, shown: BROWSER_PAGE }),
  setEquipment: (equipment) => set({ equipment, shown: BROWSER_PAGE }),
  showMore: () => set((state) => ({ shown: state.shown + BROWSER_PAGE })),
  clearFilters: () => set({ muscle: null, equipment: null, shown: BROWSER_PAGE }),
  clear: () => set(FRESH),
  showCreated: (name) => set({ ...FRESH, query: name }),
}));
