import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { haptics, type HapticBeat } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import {
  landingMs,
  motion,
  rebuildStartMs,
  restAtMs,
  soundedDiagonals,
  useHoldMotion,
  useMotion,
} from '@/theme';

import { Heatmap, type HeatmapProps } from './Heatmap';
import { usePressDelay } from './pressDelay';

const { heatmapRebuild: rebuild, hold: holdTokens } = motion;

/** Felt with the collapse's impacts: the first hardest, then lighter as the clatter dies away. */
const COLLAPSE_BEATS: readonly HapticBeat[] = rebuild.impactsMs.map((atMs, index) => ({
  atMs: rebuild.audioLeadMs + atMs,
  strength: index === 0 ? 'heavy' : index < 4 ? 'medium' : 'light',
}));

/** Felt with each heard landing of the rebuild; the last block a little firmer, finishing the stack. */
function stackBeats(columns: number, rows: number): HapticBeat[] {
  const last = columns + rows - 2;
  return soundedDiagonals(columns, rows).map((diagonal) => ({
    atMs: rebuild.audioLeadMs + landingMs(diagonal),
    strength: diagonal === last ? 'medium' : 'light',
  }));
}

/**
 * entrance: the heatmap's first reveal. collapse → stack → rest: a rebuild; at rest every block has landed
 * and its animation is dropped (the next hold starts from there, and the entrance never replays).
 */
type Phase = 'entrance' | 'collapse' | 'stack' | 'rest';
const STILL = () => null;

/**
 * A heatmap you can play with (the Welcome hero). Press and hold: it tenses and shakes while the haptic
 * ticks build up. Held long enough, it collapses (rows of blocks drop out bottom-first, one per impact of
 * the falling sound, each felt as a thud) and then stacks itself back up, diagonal by diagonal from the
 * top-left, with a wooden clack and a tick on the landings. One timeline drives the pictures, haptics
 * and sounds (motion.heatmapRebuild), so they land together.
 *
 * The blocks never remount: each phase swaps their animation, and hands over while the previous one is
 * still holding the frame the next starts from (motion/heatmapRebuild), so the collapse turns into the
 * rebuild without a single flashed frame.
 *
 * Presses wait until a rebuild is over; leaving the screen cancels whatever is still to come. With Reduce
 * Motion nothing falls: a completed hold is a success tap. Decorative, so hidden from screen readers.
 */
export function HoldableHeatmap(props: Omit<HeatmapProps, 'cellMotion'>) {
  const { grid } = props;
  const columns = grid.columns.length;
  const rows = Math.max(0, ...grid.columns.map((column) => column.length));
  const diagonals = columns + rows - 1;
  const motionSystem = useMotion();
  // On a pager page: a swipe that starts on the heatmap doesn't start a hold (no tremble, no haptic).
  const pressDelay = usePressDelay();
  const [phase, setPhase] = useState<Phase>('entrance');
  // A rebuild is playing (presses wait), and everything it has scheduled (timers, haptic sequences).
  const busy = useRef(false);
  const scheduled = useRef<(() => void)[]>([]);
  const stopRamp = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Loaded before the first hold, so each sound starts on cue.
    sounds.preload('heatmapCollapse');
    sounds.preload('heatmapStack');
    const pending = scheduled;
    const ramp = stopRamp;
    return () => {
      pending.current.forEach((cancel) => cancel());
      pending.current = [];
      ramp.current?.();
    };
  }, []);

  const later = (delayMs: number, run: () => void) => {
    const timer = setTimeout(run, delayMs);
    scheduled.current.push(() => clearTimeout(timer));
  };

  const collapseAndRebuild = () => {
    if (motionSystem.reduced) {
      haptics.success();
      return;
    }
    busy.current = true;
    sounds.play('heatmapCollapse');
    scheduled.current.push(haptics.sequence(COLLAPSE_BEATS));
    setPhase('collapse');
    later(rebuildStartMs, () => {
      sounds.play('heatmapStack');
      scheduled.current.push(haptics.sequence(stackBeats(columns, rows)));
      setPhase('stack');
      later(restAtMs(diagonals), () => {
        setPhase('rest');
        busy.current = false;
        scheduled.current = [];
      });
    });
  };

  const hold = useHoldMotion({
    onCharged: collapseAndRebuild,
    squeeze: rebuild.hold.squeeze,
    trembleDeg: rebuild.hold.trembleDeg,
  });

  const cellMotion =
    phase === 'collapse'
      ? (column: number, row: number) => motionSystem.heatmapFall(column, row, rows)
      : phase === 'stack'
        ? (column: number, row: number) => motionSystem.heatmapStack(column, row, diagonals)
        : phase === 'rest'
          ? STILL
          : null;

  return (
    <Pressable
      testID="holdable-heatmap"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      unstable_pressDelay={pressDelay || undefined}
      onPressIn={() => {
        if (busy.current || !hold.start()) return;
        stopRamp.current = haptics.ramp({ durationMs: holdTokens.chargeMs, gapMs: holdTokens.tickGapMs });
      }}
      onPressOut={() => {
        stopRamp.current?.();
        stopRamp.current = null;
        hold.cancel();
      }}
    >
      {/* Clips the falling blocks: they drop out of the grid rather than over the text below it. */}
      <Animated.View style={[styles.stage, hold.style]}>
        <Heatmap {...props} cellMotion={cellMotion} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden' },
});
