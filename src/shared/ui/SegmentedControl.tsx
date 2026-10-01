import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion, useStateTransition } from '@/theme';

import { Crossfade } from './Crossfade';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** A second, smaller line under the label (e.g. the units a system uses). */
  detail?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers (e.g. "Theme"). */
  accessibilityLabel: string;
  /** Each segment gets `${testID}-${value}`. */
  testID?: string;
}

const PAD = 3;
const GAP = 2;

/**
 * A row of mutually exclusive choices (a radio group). The label's colour and weight ease from the old
 * segment to the new one. How the selection itself moves depends on the material:
 * - Liquid Glass: one frosted pill that glides to the chosen segment on a soft spring (the motion
 *   system's `segmentSlide`), retargeting mid-flight if the choice changes again;
 * - Classic: the chosen segment's tint eases in and the old one's out, in place.
 * With Reduce Motion both change at once. The choice is applied immediately either way.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  const { theme } = useUnistyles();
  const tint = useStateTransition('backgroundColor', 'normal');
  const glass = theme.glass !== null;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Glass: the pill's position, in segments, and each segment's width once the track is measured.
  const [segment, setSegment] = useState(0);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withSpring(index, motion.segmentSlide));
  }, [index, position]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * (segment + GAP) }] }));
  const measure = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width - PAD * 2;
    setSegment((width - GAP * (options.length - 1)) / options.length);
  };

  return (
    <View
      testID={testID}
      style={styles.track}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={glass ? measure : undefined}
    >
      {glass && segment > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill(segment), pill]}
          testID={testID && `${testID}-pill`}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            testID={testID && `${testID}-${option.value}`}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.detail ? `${option.label}, ${option.detail}` : option.label}
            accessibilityState={{ checked: selected }}
            // Classic: unselected segments take the track's colour (not transparent) so the tint eases
            // cleanly. Glass: segments are clear; the pill underneath is the selection.
            style={[
              styles.segment,
              !glass && [{ backgroundColor: selected ? theme.colors.accentSoft : theme.colors.subtle }, tint],
            ]}
          >
            <Crossfade
              active={selected}
              on={
                <View style={styles.label}>
                  <Text variant="footnote" weight="semibold" tone="accent">
                    {option.label}
                  </Text>
                  {option.detail && (
                    <Text variant="caption" tone="accent">
                      {option.detail}
                    </Text>
                  )}
                </View>
              }
              off={
                <View style={styles.label}>
                  <Text variant="footnote" weight="medium" tone="secondary">
                    {option.label}
                  </Text>
                  {option.detail && (
                    <Text variant="caption" tone="secondary">
                      {option.detail}
                    </Text>
                  )}
                </View>
              }
            />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    flexDirection: 'row',
    gap: GAP,
    padding: PAD,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.subtle,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.control - PAD,
  },
  label: { alignItems: 'center', paddingVertical: theme.spacing.xs },
  pill: (width: number) => ({
    position: 'absolute' as const,
    left: PAD,
    top: PAD,
    bottom: PAD,
    width,
    borderRadius: theme.radii.control - PAD,
    backgroundColor: theme.glass?.strong,
    boxShadow: theme.glass?.card.shadow,
  }),
}));
