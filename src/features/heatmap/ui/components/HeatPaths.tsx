import { memo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

import { motion, useReduceMotion } from '@/theme';

import type { GridGeometry, GridPaths } from '../../domain/yearCalendar';

const LEVELS = [0, 1, 2, 3, 4] as const;
/** A day still to come: the empty colour, faded. */
const FUTURE_OPACITY = 0.35;

export interface HeatPathsProps {
  paths: GridPaths;
  geometry: GridGeometry;
  /** Drawn width; the grid scales to it (height follows). Defaults to the grid's own width. */
  width?: number;
  /** Today's outline width (1 on the year strip, 1.5 on a month card). */
  todayStroke?: number;
  /**
   * The screen is still sliding in: the picture keeps its room and is neither built nor drawn yet (each is
   * an SVG, built and drawn on the UI thread). Once this turns false the picture fades in; one that was
   * never held back appears at once.
   */
  held?: boolean;
}

/**
 * A year strip or a month's mini grid as one canvas: a path per look (the five heat colours, the days to
 * come, the no-details dots) and today's outline, never a view per day. A picture: nothing in it is a target.
 */
export const HeatPaths = memo(function HeatPaths({
  paths,
  geometry,
  width,
  todayStroke = 1,
  held = false,
}: HeatPathsProps) {
  const { theme } = useUnistyles();
  const reduced = useReduceMotion();
  const [heldAtFirst] = useState(held);
  const drawnWidth = width ?? paths.width;
  const scale = paths.width > 0 ? drawnWidth / paths.width : 1;
  const height = paths.height * scale;
  const inset = todayStroke / 2;
  if (held) return <View style={{ width: drawnWidth, height }} testID="heat-paths-held" />;

  const picture = (
    <Svg
      width={drawnWidth}
      height={height}
      viewBox={`0 0 ${paths.width} ${paths.height}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="heat-paths"
    >
      {LEVELS.map((level) =>
        paths.heat[level] ? <Path key={level} d={paths.heat[level]} fill={theme.heat[level]} /> : null,
      )}
      {paths.future ? <Path d={paths.future} fill={theme.heat[0]} fillOpacity={FUTURE_OPACITY} /> : null}
      {paths.dots ? <Path d={paths.dots} fill={theme.colors.accentText} /> : null}
      {paths.today ? (
        <Rect
          x={paths.today.x + inset}
          y={paths.today.y + inset}
          width={geometry.cell - todayStroke}
          height={geometry.cell - todayStroke}
          rx={Math.max(0, geometry.radius - inset)}
          fill="none"
          stroke={theme.colors.text}
          strokeWidth={todayStroke}
        />
      ) : null}
    </Svg>
  );
  return heldAtFirst && !reduced ? (
    <Animated.View entering={FadeIn.duration(motion.duration.fast)}>{picture}</Animated.View>
  ) : (
    picture
  );
});
