import { create } from 'zustand';

import type { ExerciseType } from '@/core/db/schema';

import {
  addItem,
  moveItem,
  moveItemTo,
  removeItem,
  updateItem,
  type RoutineDraft,
  type TargetChange,
} from '../domain/draft';

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
  /** Dropped after a drag: to place `to`, the rest closing up around it. */
  moveTo: (key: string, to: number) => void;
  /** Its sets, reps or seconds, or the weight its first workout starts from. */
  update: (key: string, change: TargetChange) => void;
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
  // A change that leaves the items as they were keeps the draft too, so nothing re-renders for it.
  const edit = (change: (draft: RoutineDraft) => RoutineDraft) =>
    set((state) => {
      if (!state.draft) return state;
      const draft = change(state.draft);
      return draft === state.draft ? state : { draft };
    });
  const editItems = (change: (items: RoutineDraft['items']) => RoutineDraft['items']) =>
    edit((draft) => {
      const items = change(draft.items);
      return items === draft.items ? draft : { ...draft, items };
    });

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
    remove: (key) => editItems((items) => removeItem(items, key)),
    move: (key, direction) => editItems((items) => moveItem(items, key, direction)),
    moveTo: (key, to) => editItems((items) => moveItemTo(items, key, to)),
    update: (key, change) => editItems((items) => updateItem(items, key, change)),
  };
});
