import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

export interface ProgressBarProps {
  /** 0…1 */
  value: number;
  /** The fill colour (default: accent). */
  color?: string;
  height?: number;
}

/** A horizontal fill (Time of day, the insights progress). Its width eases to a new value. */
export function ProgressBar({ value, color, height = 8 }: ProgressBarProps) {
  const { theme } = useUnistyles();
  const grow = useStateTransition('width', 'normal');
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={styles.track(height)} accessible={false}>
      <Animated.View
        style={[
          styles.fill,
          { width: `${percent}%`, backgroundColor: color ?? theme.colors.accentText },
          grow,
        ]}
      />
    </View>
  );
}

export interface StackBarProps {
  segments: readonly { key: string; share: number; color: string }[];
}

/** Shares of a whole side by side (consistency levels, activities). Empty segments take no room. */
export function StackBar({ segments }: StackBarProps) {
  return (
    <View style={styles.stack} accessible={false}>
      {segments
        .filter((segment) => segment.share > 0)
        .map((segment) => (
          <View
            key={segment.key}
            style={[styles.segment, { flex: segment.share, backgroundColor: segment.color }]}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: (height: number) => ({
    height,
    borderRadius: height / 2,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.subtle,
  }),
  fill: { height: '100%', borderRadius: 4 },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  segment: { height: '100%' },
}));
