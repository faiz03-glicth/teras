import { create } from 'zustand';

import type { ExerciseType } from '@/core/db/schema';

import { addItem, moveItem, removeItem, type RoutineDraft } from '../domain/draft';

interface RoutineDraftState {
  /** The editor holding the draft. Another editor opening takes it over. */
  holder: symbol | null;
  /** The routine as it was opened, to tell whether anything has changed. */
  saved: RoutineDraft | null;
  /** The routine being edited. */
  draft: RoutineDraft | null;
  open: (holder: symbol, draft: RoutineDraft) => void;
  rename: (name: string) => void;
  add: (exerciseId: string, type: ExerciseType) => void;
  remove: (key: string) => void;
  move: (key: string, direction: -1 | 1) => void;
}

/** Keys for exercises added in this editor; saved ones keep their row ids. */
let added = 0;

/**
 * UI state only, never saved: the routine being edited. A store rather than the editor's own state
 * because the exercise library is a screen of its own, and it adds to the routine the editor shows.
 * Nothing reaches SQLite until Save. It is not cleared when the editor goes: a screen is hidden,
 * refreshed or remounted without being gone, so the next editor to open simply takes it over.
 */
export const useRoutineDraftStore = create<RoutineDraftState>()((set) => {
  const edit = (change: (draft: RoutineDraft) => RoutineDraft) =>
    set((state) => (state.draft ? { draft: change(state.draft) } : state));

  return {
    holder: null,
    saved: null,
    draft: null,
    open: (holder, draft) => set({ holder, saved: draft, draft }),
    rename: (name) => edit((draft) => ({ ...draft, name })),
    add: (exerciseId, type) =>
      edit((draft) => ({
        ...draft,
        items: addItem(draft.items, { key: `added-${++added}`, exerciseId, type }),
      })),
    remove: (key) => edit((draft) => ({ ...draft, items: removeItem(draft.items, key) })),
    move: (key, direction) => edit((draft) => ({ ...draft, items: moveItem(draft.items, key, direction) })),
  };
});
