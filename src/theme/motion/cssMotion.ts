import { css } from 'react-native-reanimated';

import { cssEase, motion } from '../tokens/motion';
import { fallSpanMs, rowReleaseMs, stackSpanMs } from './heatmapRebuild';

const { heatmapReveal: reveal, heatmapRebuild: rebuild, staggerIn: rise, pulse } = motion;

/*
 * CSS animations (Reanimated's declarative keyframes): they run natively from a style, with no hooks per
 * element, which suits many small things (heat cells, list rows). They do NOT know about Reduce Motion, so
 * components never use these directly: they go through useMotion(), which resolves it once.
 *
 * None of them animates a colour. Every element keeps its own theme colour and only its opacity, scale or
 * position moves, so a preset looks the same in light, dark and glass.
 */

/**
 * When each day starts revealing: a sweep across the columns and down the rows, with a small, stable
 * per-cell nudge so the wave looks organic rather than mechanical.
 */
export function heatmapRevealDelay(column: number, row: number): number {
  const sweep = column * reveal.columnMs + row * reveal.rowMs;
  const nudge = ((column * 31 + row * 17) % 7) * 4;
  return sweep + nudge;
}

/** heatmapReveal: a day fades in and grows to full size, already in its level's colour. */
const grow = css.keyframes({
  from: { opacity: 0, transform: [{ scale: reveal.fromScale }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
});
export const heatmapReveal = (column: number, row: number) =>
  ({
    animationName: grow,
    animationDuration: reveal.durationMs,
    animationDelay: heatmapRevealDelay(column, row),
    animationTimingFunction: cssEase.emphasis,
    // Holds the first keyframe (hidden) while the cell waits for its turn.
    animationFillMode: 'backwards',
  }) as const;
export type HeatmapRevealStyle =
  ReturnType<typeof heatmapReveal> | ReturnType<typeof heatmapFall> | ReturnType<typeof heatmapStack>;

/*
 * The heatmap rebuild's two block animations. Each spans its whole phase, not just its own move: a block
 * waits in the state the phase starts from, moves at its moment, then holds the state the next phase starts
 * from until well after that phase has taken over (heatmapRebuild's hand-overs). Blocks never remount
 * between phases, so switching phases never shows a frame outside the choreography: no flash.
 * Keyframes are made once per distinct timing and reused.
 */
const percent = (ms: number, spanMs: number) => `${Number(((ms / spanMs) * 100).toFixed(3))}%`;
function memo<T>(make: (key: string) => T): (key: string) => T {
  const made = new Map<string, T>();
  return (key) => {
    const cached = made.get(key);
    if (cached) return cached;
    const value = make(key);
    made.set(key, value);
    return value;
  };
}

/**
 * heatmapFall: a day's block giving way in the collapse. Its whole row goes at once, on one impact of the
 * falling sound (bottom row first), with a few ms of scatter inside the row; the block drops with gravity
 * (slow to start, then faster), drifting and turning a little one of four ways, and is gone. It stays gone
 * (and invisible) until the rebuild has begun.
 */
const TUMBLES = [
  { drift: -6, turn: -18 },
  { drift: 4, turn: 9 },
  { drift: -3, turn: -7 },
  { drift: 7, turn: 21 },
] as const;
const STANDING = { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] };
const fallRule = memo((key) => {
  const [releaseMs = 0, tumble = 0] = key.split(':').map(Number);
  const { drift, turn } = TUMBLES[tumble % TUMBLES.length] ?? TUMBLES[0];
  const fallen = {
    opacity: 0,
    transform: [{ translateX: drift }, { translateY: rebuild.fallDistance }, { rotate: `${turn}deg` }],
  };
  const start = rebuild.audioLeadMs + releaseMs;
  return css.keyframes({
    '0%': STANDING,
    [percent(start, fallSpanMs)]: STANDING,
    [percent(start + rebuild.fallMs, fallSpanMs)]: fallen,
    '100%': fallen,
  });
});
export const heatmapFall = (column: number, row: number, rows: number) =>
  ({
    animationName: fallRule(`${rowReleaseMs(row, rows)}:${(column * 7 + row * 3) % TUMBLES.length}`),
    animationDuration: fallSpanMs,
    animationDelay: ((column * 13 + row * 5) % 4) * 4,
    animationTimingFunction: cssEase.exit,
    animationFillMode: 'forwards',
  }) as const;

/**
 * heatmapStack: a day's block dropped back into place: it appears a little above its spot, falls the last
 * few points faster and faster and lands at the end of its drop, diagonal by diagonal from the top-left
 * (`diagonals`: how many the heatmap has, which sets how long the others take). Each landing is when its
 * clack is heard (see heatmapRebuild). The style itself is invisible, so the block only ever shows what
 * the animation shows; it holds "landed" until the heatmap is back at rest.
 */
const WAITING = { opacity: 0, transform: [{ translateY: -rebuild.stackDistance }, { scale: 0.9 }] };
const LANDED = { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
const stackRule = memo((key) => {
  const [diagonal = 0, diagonals = 1] = key.split(':').map(Number);
  const span = stackSpanMs(diagonals);
  const start = rebuild.audioLeadMs + diagonal * reveal.waveStepMs;
  return css.keyframes({
    '0%': WAITING,
    [percent(start, span)]: WAITING,
    [percent(start + rebuild.stackMs * 0.4, span)]: {
      opacity: 1,
      transform: [{ translateY: -rebuild.stackDistance * 0.84 }, { scale: 0.94 }],
    },
    [percent(start + rebuild.stackMs, span)]: LANDED,
    '100%': LANDED,
  });
});
export const heatmapStack = (column: number, row: number, diagonals: number) =>
  ({
    opacity: 0,
    animationName: stackRule(`${column + row}:${diagonals}`),
    animationDuration: stackSpanMs(diagonals),
    animationTimingFunction: cssEase.exit,
    animationFillMode: 'forwards',
  }) as const;

/**
 * staggerIn: list rows rising into place one after another (onboarding's intensity levels). While
 * `playing` is false the rows wait, hidden, at their first frame (e.g. on a page not reached yet), and
 * rise as soon as it turns true.
 */
const riseIn = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: rise.distance }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});
export const staggerIn = (index: number, playing = true) =>
  ({
    animationName: riseIn,
    animationDuration: rise.durationMs,
    animationDelay: index * rise.gapMs,
    animationTimingFunction: cssEase.enter,
    animationFillMode: 'backwards',
    animationPlayState: playing ? 'running' : 'paused',
  }) as const;

/** pulse: the "just checked in" beat on a heat cell. */
export const checkInPulse = {
  animationName: css.keyframes({
    '0%': { transform: [{ scale: 1 }] },
    '50%': { transform: [{ scale: pulse.scale }] },
    '100%': { transform: [{ scale: 1 }] },
  }),
  animationDuration: pulse.durationMs,
  animationIterationCount: pulse.repeats,
  animationTimingFunction: cssEase.standard,
} as const;
