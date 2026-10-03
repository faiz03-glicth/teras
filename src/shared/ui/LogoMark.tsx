import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { haptics, type HapticBeat } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { flipLandingMs, motion, restAtMs, useHoldMotion, useMotion, type HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';

const PATTERN: readonly HeatLevel[] = [2, 4, 3, 1, 3, 4, 3, 2, 4];
const COLUMNS = 3;
const DIAGONALS = 2 * COLUMNS - 1;

/** Felt as each diagonal of the new face lands, on its wooden clack; the last a little firmer. */
const LANDING_BEATS: readonly HapticBeat[] = Array.from({ length: DIAGONALS }, (_, diagonal) => ({
  atMs: motion.heatmapRebuild.audioLeadMs + flipLandingMs(diagonal),
  strength: diagonal === DIAGONALS - 1 ? 'medium' : 'light',
}));

export interface LogoMarkProps {
  size?: number;
  /** The mark is a patch of heatmap, so it arrives like one: the motion system's heatmapReveal. */
  animateIn?: boolean;
  /**
   * Press and hold to play: the mark tenses and trembles while haptic ticks build up; held long enough, it
   * flips over and its blocks stack back in like the Welcome heatmap's, diagonal by diagonal from the
   * top-left, each landing on a wooden clack and a tick. A tap is a light tick.
   */
  holdable?: boolean;
}

/** The Teras mark: a 3×3 patch of heatmap. Proportions scale from the 76pt login version. */
export function LogoMark({ size = 76, animateIn = false, holdable = false }: LogoMarkProps) {
  const motionSystem = useMotion();
  // The face on show: the first one (with its entrance), a new one stacking in after a flip, or at rest.
  // The cells are never remounted: the face changes by swapping their animation, edge-on.
  const [face, setFace] = useState<'first' | 'stacking' | 'rest'>('first');
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRamp = useRef<(() => void) | null>(null);
  const stopBeats = useRef<(() => void) | null>(null);
  const hold = useHoldMotion({
    // The release: a success tap; then, if the mark moves, the flip's whoosh and its blocks' clacks and
    // ticks (one timeline: the sound, heatmapStack and these beats all land together).
    onCharged: () => {
      haptics.success();
      if (motionSystem.reduced) return;
      sounds.play('logoFlip');
      stopBeats.current?.();
      stopBeats.current = haptics.sequence(LANDING_BEATS);
    },
    onTurn: () => {
      setFace('stacking');
      if (settle.current) clearTimeout(settle.current);
      // Every block landed: drop the animations (they're still holding "landed" then, so nothing changes).
      settle.current = setTimeout(() => setFace('rest'), restAtMs(DIAGONALS));
    },
  });

  useEffect(() => {
    const ramp = stopRamp;
    const beats = stopBeats;
    const settling = settle;
    return () => {
      ramp.current?.();
      beats.current?.();
      if (settling.current) clearTimeout(settling.current);
    };
  }, []);
  // Loaded before the first hold, so the sound starts exactly with the flip.
  useEffect(() => {
    if (holdable) sounds.preload('logoFlip');
  }, [holdable]);

  const padding = Math.round(size * (12 / 76));
  const gap = Math.max(2, Math.round(size * (4 / 76)));
  const cell = (size - 2 - padding * 2 - gap * 2) / 3;

  // Decorative either way: the mark carries no information, so screen readers skip it.
  const mark = (
    <Animated.View
      style={[styles.mark(size, padding, gap), holdable && hold.style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {PATTERN.map((level, index) => {
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const appear =
          face === 'stacking'
            ? motionSystem.heatmapStack(column, row, DIAGONALS)
            : face === 'first' && animateIn
              ? motionSystem.heatmapReveal(column, row)
              : null;
        return <HeatCell key={index} level={level} size={cell} radius={4} appear={appear} />;
      })}
    </Animated.View>
  );

  if (!holdable) return mark;
  return (
    <Pressable
      testID="logo-mark"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onPressIn={() => {
        if (!hold.start()) return;
        stopRamp.current = haptics.ramp({ durationMs: motion.hold.chargeMs, gapMs: motion.hold.tickGapMs });
      }}
      onPressOut={() => {
        stopRamp.current?.();
        stopRamp.current = null;
        hold.cancel();
      }}
    >
      {mark}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  mark: (size: number, padding: number, gap: number) => ({
    width: size,
    height: size,
    padding,
    gap,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    borderRadius: Math.round(size * (22 / 76)),
    backgroundColor: theme.material.raised.background,
    boxShadow: theme.material.raised.shadow,
  }),
}));
