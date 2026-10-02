import { create } from 'zustand';

import type { ISODate } from '@/shared/lib/date/isoDate';

interface SelectedDayState {
  /** The day whose detail is open, ringed on every wave that shows it; null when none is. */
  day: ISODate | null;
  select: (day: ISODate) => void;
  /** Clears the ring, but only if it is still this day's (another day's sheet may have taken over). */
  release: (day: ISODate) => void;
}

/**
 * UI state only, never saved: which day's detail sheet is open. The sheet sets it while it is up, so the
 * cell that was tapped stays ringed above the sheet, on Home and in the Calendar alike.
 */
export const useSelectedDayStore = create<SelectedDayState>()((set) => ({
  day: null,
  select: (day) => set({ day }),
  release: (day) => set((state) => (state.day === day ? { day: null } : state)),
}));
