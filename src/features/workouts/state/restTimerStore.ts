import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import { adjustRest } from '../domain/rest';

interface RestTimerState {
  /** The workout the rest belongs to: a rest left over from another workout is never shown. */
  workoutId: string | null;
  /** When the rest is over (ISO), or null when no rest is running. */
  endsAt: string | null;
  start: (workoutId: string, seconds: number, now: number) => void;
  /** One step of the rest bar's − or +; going past now ends the rest. */
  adjust: (direction: 1 | -1, now: number) => void;
  stop: () => void;
}

/**
 * The rest between sets. UI state, not workout data, so it lives here rather than in SQLite — but it is
 * kept on the device, so leaving the workout, or the app being closed, never loses a rest under way.
 * It is an end time, never a count: the remaining seconds are always worked out from the clock.
 */
export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set) => ({
      workoutId: null,
      endsAt: null,
      start: (workoutId, seconds, now) =>
        set({ workoutId, endsAt: new Date(now + seconds * 1000).toISOString() }),
      adjust: (direction, now) => set(({ endsAt }) => ({ endsAt: adjustRest(endsAt, direction, now) })),
      stop: () => set({ endsAt: null }),
    }),
    {
      name: 'teras.rest-timer',
      version: 1,
      storage: persistStorage,
      partialize: ({ workoutId, endsAt }) => ({ workoutId, endsAt }),
    },
  ),
);
