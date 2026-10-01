import { heatmapFall, heatmapStack } from '../motion/cssMotion';
import {
  collapseMs,
  fallSpanMs,
  flipCatchMs,
  flipLandingMs,
  landingMs,
  rebuildMs,
  rebuildStartMs,
  restAtMs,
  rowReleaseMs,
  soundedDiagonals,
  stackSpanMs,
} from '../motion/heatmapRebuild';
import { motion } from '../tokens/motion';

// Written by scripts/sounds/build-sounds.py alongside the sound files it builds.
const built = require('../../../assets/sounds/sound-timings.json') as {
  heatmapCollapse: { impactsMs: number[] };
  heatmapStack: {
    columns: number;
    rows: number;
    stepMs: number;
    stackMs: number;
    soundedDiagonals: number[];
    clacksMs: number[];
  };
  logoFlip: {
    flipMs: number;
    side: number;
    audioLeadMs: number;
    coinCatchMs: number;
    clacksMs: number[];
  };
};

const { heatmapRebuild: rebuild, heatmapReveal: reveal, hold } = motion;

describe('the heatmap rebuild timeline', () => {
  it('releases one row per impact, bottom row first', () => {
    expect(rowReleaseMs(6, 7)).toBe(0);
    expect(rowReleaseMs(0, 7)).toBe(rebuild.impactsMs.at(-1));
    const releases = [6, 5, 4, 3, 2, 1, 0].map((row) => rowReleaseMs(row, 7));
    expect([...releases].sort((a, b) => a - b)).toEqual(releases);
  });

  it('pauses on an empty grid, then stacks diagonal by diagonal, landing at the end of each drop', () => {
    expect(rebuildStartMs).toBe(collapseMs + rebuild.pauseMs);
    expect(landingMs(0)).toBe(rebuild.stackMs);
    expect(landingMs(3) - landingMs(2)).toBe(reveal.waveStepMs);
    expect(rebuildMs(14, 7)).toBe(landingMs(19));
  });

  it('is heard on every other landing and on the last block', () => {
    const heard = soundedDiagonals(14, 7);
    expect(heard[0]).toBe(0);
    expect(heard.at(-1)).toBe(19);
    expect(heard.slice(0, -1).every((diagonal) => diagonal % 2 === 0)).toBe(true);
  });
});

describe('the sounds were built from the same timelines (re-run scripts/sounds/build-sounds.py)', () => {
  it('heatmap collapse: one impact per row, at the times the rows are released', () => {
    expect(built.heatmapCollapse.impactsMs).toEqual([...rebuild.impactsMs]);
  });

  it('heatmap stack: a clack exactly when each heard diagonal lands', () => {
    const { columns, rows, stepMs, stackMs } = built.heatmapStack;
    expect({ stepMs, stackMs }).toEqual({ stepMs: reveal.waveStepMs, stackMs: rebuild.stackMs });
    expect(built.heatmapStack.soundedDiagonals).toEqual(soundedDiagonals(columns, rows));
    expect(built.heatmapStack.clacksMs).toEqual(soundedDiagonals(columns, rows).map(landingMs));
  });

  it("logo flip: a clack as each of the mark's five diagonals lands after the turn", () => {
    expect(built.logoFlip.flipMs).toBe(hold.flipMs);
    const diagonals = Array.from({ length: 2 * built.logoFlip.side - 1 }, (_, diagonal) => diagonal);
    expect(built.logoFlip.clacksMs).toEqual(diagonals.map(flipLandingMs));
  });

  it('logo flip: the coin is caught as the flip lands (placed a speaker delay early)', () => {
    expect(built.logoFlip.audioLeadMs).toBe(rebuild.audioLeadMs);
    expect(built.logoFlip.coinCatchMs).toBe(flipCatchMs);
    expect(flipCatchMs + rebuild.audioLeadMs).toBe(hold.flipMs);
  });
});

describe('hand-overs never flash', () => {
  /** The keyframes of a CSS animation, in order, as [offset 0–1, frame]. */
  const framesOf = (rule: { cssRules: Record<string, { opacity?: number }> }) =>
    Object.entries(rule.cssRules)
      .map(([selector, frame]) => [parseFloat(selector) / 100, frame] as const)
      .sort(([a], [b]) => a - b);

  it('the collapse still holds every block fallen (invisible) when the rebuild takes over', () => {
    expect(fallSpanMs).toBeGreaterThanOrEqual(rebuildStartMs + rebuild.handoverMs);
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const fall = heatmapFall(column, row, 7);
        const frames = framesOf(fall.animationName as never);
        expect(frames.at(-1)?.[1].opacity).toBe(0);
        // Fallen before the rebuild starts, and held (as the last frame) after it has.
        const fallenAt = frames.findIndex(([, frame]) => frame.opacity === 0);
        expect(frames[fallenAt]?.[0] ?? 1).toBeLessThan(rebuildStartMs / fallSpanMs);
      }
    }
  });

  it('stacking starts from that same invisible frame, and its style is invisible without the animation', () => {
    for (const diagonal of [0, 7, 19]) {
      const stack = heatmapStack(diagonal, 0, 20);
      const frames = framesOf(stack.animationName as never);
      expect(frames[0]?.[1].opacity).toBe(0);
      expect(stack.opacity).toBe(0);
    }
  });

  it('the rebuild still holds every block landed (visible, in place) when the heatmap returns to rest', () => {
    for (const diagonals of [20, 5]) {
      expect(stackSpanMs(diagonals)).toBeGreaterThanOrEqual(restAtMs(diagonals) + rebuild.handoverMs);
      // The last diagonal's block reaches its landed frame (the one it then holds) before rest is declared.
      const frames = framesOf(heatmapStack(diagonals - 1, 0, diagonals).animationName as never);
      const held = JSON.stringify(frames.at(-1)?.[1]);
      const landedOffset = frames.find(([, frame]) => JSON.stringify(frame) === held)?.[0] ?? 1;
      expect(frames.at(-1)?.[1].opacity).toBe(1);
      expect(landedOffset * stackSpanMs(diagonals)).toBeLessThanOrEqual(restAtMs(diagonals) + 1);
    }
  });
});
