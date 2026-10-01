import { motion } from '../tokens/motion';

const { heatmapRebuild: rebuild, heatmapReveal: reveal } = motion;

/*
 * The heatmap rebuild's timeline, in ms. Pure, so the animation, the haptics and the sound files (built
 * from the same numbers by scripts/sounds/build-sounds.py) all agree on when things happen.
 * Times are from the moment each part starts playing its sound; pictures and haptics add
 * `heatmapRebuild.audioLeadMs` on top so they land with what's heard.
 */

/** When a row gives way in the collapse: bottom row first, one row per impact of the falling sound. */
export function rowReleaseMs(row: number, rows: number): number {
  const fromBottom = Math.max(0, rows - 1 - row);
  return rebuild.impactsMs[Math.min(fromBottom, rebuild.impactsMs.length - 1)] ?? 0;
}

/** The whole collapse: the last row's release plus its fall. */
export const collapseMs = (rebuild.impactsMs.at(-1) ?? 0) + rebuild.fallMs;

/** When the rebuild starts (and its sound plays), from the start of the collapse. */
export const rebuildStartMs = collapseMs + rebuild.pauseMs;

/** When the blocks of one diagonal (column + row) land, from the start of the rebuild. */
export function landingMs(diagonal: number): number {
  return diagonal * reveal.waveStepMs + rebuild.stackMs;
}

/** The landings that are heard and felt: every other diagonal (a stacking rhythm, not a rattle) and the last. */
export function soundedDiagonals(columns: number, rows: number): number[] {
  const diagonals = columns + rows - 1;
  const heard: number[] = [];
  for (let diagonal = 0; diagonal < diagonals; diagonal += 2) heard.push(diagonal);
  if (heard.at(-1) !== diagonals - 1) heard.push(diagonals - 1);
  return heard;
}

/** The rebuild, until its last block lands. */
export function rebuildMs(columns: number, rows: number): number {
  return landingMs(columns + rows - 2);
}

/*
 * Hand-overs. A phase's animations keep holding their final frame `handoverMs` past the moment the next
 * phase takes over, and the next phase starts from that very frame. So whenever the switch actually lands
 * (a timer, a render, the native side attaching an animation a frame late), every block looks the same on
 * both sides of it: no flash.
 */

/** A block's fall, from the collapse's start: it holds "fallen" until well after the rebuild has begun. */
export const fallSpanMs = rebuildStartMs + rebuild.handoverMs;

/** When a stacked heatmap is at rest (every block landed and heard), from its stacking's start. */
export function restAtMs(diagonals: number): number {
  return rebuild.audioLeadMs + landingMs(diagonals - 1);
}

/** A block's stacking, from its start: it holds "landed" until well after the heatmap is back at rest. */
export function stackSpanMs(diagonals: number): number {
  return restAtMs(diagonals) + rebuild.handoverMs;
}

/**
 * The login mark's flip: once it's edge-on (halfway through the flip) its new face stacks in like the
 * Welcome heatmap does, diagonal by diagonal. When each diagonal lands, from the moment the hold completes.
 */
export const flipTurnMs = motion.hold.flipMs / 2;
/**
 * The coin's catch, in the flip's sound: as the flip lands. The flip itself doesn't wait for its sound,
 * so the catch is placed a speaker delay early to be heard exactly then.
 */
export const flipCatchMs = motion.hold.flipMs - rebuild.audioLeadMs;
export function flipLandingMs(diagonal: number): number {
  return flipTurnMs + landingMs(diagonal);
}
