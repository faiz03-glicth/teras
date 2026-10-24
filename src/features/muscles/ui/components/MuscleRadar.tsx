import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  RADAR_AXES,
  RADAR_HEIGHT,
  RADAR_LABELS,
  RADAR_RINGS,
  RADAR_WIDTH,
} from '@/features/muscles/domain/radar';
import { Text } from '@/shared/ui';

/** How much of the "now" shape's gold shows through its fill. */
export const NOW_FILL_OPACITY = 0.26;
const BEFORE_DASH = '4 3';

export interface MuscleRadarProps {
  /** Polygon `points` of the last 4 weeks; empty draws nothing. */
  now: string;
  /** Polygon `points` of the 4 weeks before; empty draws nothing. */
  before: string;
  accessibilityLabel: string;
}

/**
 * The spider web: a ring at a third, two thirds and all of the scale, an axis to each of the ten muscles, and
 * two shapes, the 4 weeks before (a dashed outline) and the last 4 weeks (filled gold). Three polygons for
 * the rings, one path for every axis and two polygons for the shapes, in one Svg; the names are plain text
 * placed round it. The web itself never changes, so only the two shapes depend on the data. It scales to the
 * card's width.
 */
export const MuscleRadar = memo(function MuscleRadar({ now, before, accessibilityLabel }: MuscleRadarProps) {
  const { theme } = useUnistyles();
  const { border, text3, accent, accentText } = theme.colors;
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="muscle-radar"
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${RADAR_WIDTH} ${RADAR_HEIGHT}`}>
        {RADAR_RINGS.map((points) => (
          <Polygon key={points} points={points} fill="none" stroke={border} strokeWidth={1} />
        ))}
        <Path d={RADAR_AXES} fill="none" stroke={border} strokeWidth={1} />
        {before !== '' && (
          <Polygon
            points={before}
            fill="none"
            stroke={text3}
            strokeWidth={1.5}
            strokeDasharray={BEFORE_DASH}
            strokeLinejoin="round"
            testID="radar-before"
          />
        )}
        {now !== '' && (
          <Polygon
            points={now}
            fill={accent}
            fillOpacity={NOW_FILL_OPACITY}
            stroke={accentText}
            strokeWidth={2}
            strokeLinejoin="round"
            testID="radar-now"
          />
        )}
      </Svg>
      {RADAR_LABELS.map(({ group, label, x, y }) => (
        <Text key={group} variant="caption" tone="secondary" align="center" style={styles.label(x, y)}>
          {label}
        </Text>
      ))}
    </View>
  );
});

/** A label is this wide, its middle on the axis. */
const LABEL_WIDTH = 76;

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: RADAR_WIDTH, aspectRatio: RADAR_WIDTH / RADAR_HEIGHT, alignSelf: 'center' },
  label: (x: number, y: number) => ({
    position: 'absolute' as const,
    left: `${x * 100}%` as const,
    top: `${y * 100}%` as const,
    width: LABEL_WIDTH,
    marginLeft: -LABEL_WIDTH / 2,
  }),
});
