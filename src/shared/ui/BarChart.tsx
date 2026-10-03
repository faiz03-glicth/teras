import { memo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Text } from './Text';

export interface BarChartProps {
  values: readonly number[];
  /** Summarises the chart for screen readers (the bars themselves aren't read one by one). */
  accessibilityLabel: string;
  height?: number;
  /** Which bars stand out in the accent colour: the current period (last), or the peak (max). */
  highlight?: 'last' | 'max';
  /** A dashed reference line with its label ("avg 21"). */
  average?: number;
  gap?: number;
  /** Axis labels: one per bar ('each'), or a few spread evenly from start to end ('spread'). */
  labels?: readonly string[];
  labelMode?: 'each' | 'spread';
  /** Smaller bar corners, for charts with many bars (a month of days). */
  dense?: boolean;
  /**
   * Keeps room for this many bars, filling from the right: two weeks of history draw two narrow bars at
   * the end, not two that span the card. Labels line up over the bars that are drawn.
   */
  slots?: number;
}

const MIN_BAR = 4;

/**
 * The app's one bar chart (Home trend, Insights): plain views, no chart library. Heights ease when the
 * data changes (a new range), and change instantly with Reduce Motion. Highlighting is kept to what
 * matters: the current period or the peak.
 */
export const BarChart = memo(function BarChart({
  values,
  accessibilityLabel,
  height = 100,
  highlight = 'last',
  average,
  gap = 7,
  labels,
  labelMode = 'each',
  dense = false,
  slots = 0,
}: BarChartProps) {
  const { theme } = useUnistyles();
  const grow = useStateTransition('height', 'normal');
  const max = Math.max(1, ...values, average ?? 0);
  const peak = Math.max(...values);
  const spaces = Math.max(0, slots - values.length);
  const isHighlighted = (value: number, index: number) =>
    highlight === 'last' ? index === values.length - 1 : value === peak && value > 0;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={styles.bars(height, gap)}>
        {Array.from({ length: spaces }, (_, index) => (
          <View key={`space-${index}`} style={styles.space} testID="bar-space" />
        ))}
        {values.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar(dense),
              {
                height: Math.max(MIN_BAR, (value / max) * height),
                backgroundColor: isHighlighted(value, index) ? theme.colors.accentText : theme.heat[2],
              },
              grow,
            ]}
          />
        ))}
        {average !== undefined && average > 0 && (
          <View pointerEvents="none" style={[styles.average, { bottom: (average / max) * height }]}>
            <Svg height={2} width="100%">
              <Line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke={theme.colors.text3}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
            </Svg>
            <Text variant="mini" tone="tertiary" style={styles.averageLabel}>
              avg {average}
            </Text>
          </View>
        )}
      </View>
      {labels && (
        <View
          style={[
            styles.axis(labelMode === 'each' ? gap : 0),
            styles.axisStart(spaces, spaces + values.length),
          ]}
        >
          {labels.map((label, index) => (
            <Text
              key={index}
              variant="mini"
              tone="tertiary"
              align="center"
              numberOfLines={1}
              style={labelMode === 'each' ? styles.eachLabel : undefined}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  bars: (height: number, gap: number) => ({
    height,
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap,
  }),
  bar: (dense: boolean) => ({
    flex: 1,
    borderTopLeftRadius: dense ? 3 : 6,
    borderTopRightRadius: dense ? 3 : 6,
    borderBottomLeftRadius: dense ? 2 : 3,
    borderBottomRightRadius: dense ? 2 : 3,
  }),
  space: { flex: 1 },
  // The labels start over the first bar drawn, past the room kept for bars to come.
  axisStart: (spaces: number, total: number) => ({
    marginLeft: spaces > 0 ? (`${(spaces / total) * 100}%` as const) : 0,
  }),
  average: { position: 'absolute', left: 0, right: 0, height: 2 },
  averageLabel: {
    position: 'absolute',
    right: 0,
    top: -18,
    paddingHorizontal: 3,
    backgroundColor: theme.material.raised.background,
  },
  axis: (gap: number) => ({
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap,
    marginTop: theme.spacing.sm,
  }),
  eachLabel: { flex: 1 },
}));
