import { useMemo, useState } from 'react';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { checkInPulse, heatmapFall, heatmapReveal, heatmapStack, staggerIn } from './cssMotion';

/**
 * The motion system for components: the CSS presets, already resolved against the app's Reduce Motion
 * (each returns null when motion is reduced, so the element simply shows its final state). Components ask
 * for a preset by meaning and never check Reduce Motion themselves. Layout animations come from
 * `layoutMotion`, which handles Reduce Motion on its own.
 *
 * Entrances (heatmapReveal, staggerIn) play once, when the element appears. If Reduce Motion is turned on
 * while one plays it stops at the final state, and it never replays when Reduce Motion is turned off again.
 */
export function useMotion() {
  const reduced = useReduceMotion();
  const [entrances, setEntrances] = useState(!reduced);
  if (entrances && reduced) setEntrances(false);

  return useMemo(
    () => ({
      reduced,
      /** A heatmap day's reveal: pass its column and row; the sweep timing is the preset's own. */
      heatmapReveal: (column: number, row: number) => (entrances ? heatmapReveal(column, row) : null),
      /** Pass `playing: false` to hold the rows (hidden) until their page is on screen. */
      staggerIn: (index: number, playing = true) => (entrances ? staggerIn(index, playing) : null),
      /**
       * The heatmap rebuild (events, not entrances: they play each time they're asked for): a block falling
       * in the collapse, and dropping back into place (also the login mark's new face after its flip).
       */
      heatmapFall: (column: number, row: number, rows: number) =>
        reduced ? null : heatmapFall(column, row, rows),
      heatmapStack: (column: number, row: number, diagonals: number) =>
        reduced ? null : heatmapStack(column, row, diagonals),
      pulse: (active: boolean) => (reduced || !active ? null : checkInPulse),
    }),
    [reduced, entrances],
  );
}
