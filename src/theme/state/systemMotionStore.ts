import { create } from 'zustand';

interface SystemMotionState {
  /** The phone's Reduce Motion setting, or null until the OS has answered (never persisted). */
  reduceMotion: boolean | null;
  setReduceMotion: (reduceMotion: boolean) => void;
}

/** State only: the live system setting, kept current by MotionRuntimeBridge. */
export const useSystemMotionStore = create<SystemMotionState>()((set) => ({
  reduceMotion: null,
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
}));
