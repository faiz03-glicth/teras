import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

import { NOW_FILL_OPACITY } from './MuscleRadar';

const KEY_WIDTH = 16;
const KEY_HEIGHT = 10;

/** What the two shapes are, drawn as the shapes themselves: filled for the last 4 weeks, dashed for the 4 before. */
export const RadarKey = memo(function RadarKey() {
  const { theme } = useUnistyles();
  const { accent, accentText, accentEdge } = theme.colors;
  return (
    <View style={styles.row} testID="muscle-balance-key">
      <View style={styles.item}>
        <Svg width={KEY_WIDTH} height={KEY_HEIGHT}>
          <Rect
            x={1}
            y={1}
            width={KEY_WIDTH - 2}
            height={KEY_HEIGHT - 2}
            rx={3}
            fill={accent}
            fillOpacity={NOW_FILL_OPACITY}
            stroke={accentText}
            strokeWidth={2}
          />
        </Svg>
        <Text variant="caption" tone="tertiary">
          Last 4 weeks
        </Text>
      </View>
      <View style={styles.item}>
        <Svg width={KEY_WIDTH} height={KEY_HEIGHT}>
          <Line
            x1={0}
            y1={KEY_HEIGHT / 2}
            x2={KEY_WIDTH}
            y2={KEY_HEIGHT / 2}
            stroke={accentEdge}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        </Svg>
        <Text variant="caption" tone="tertiary">
          The 4 before
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
