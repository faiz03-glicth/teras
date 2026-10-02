import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { regionShade, type Highlight, type RegionShade } from '@/features/exercises/domain/bodyMap';

import { BODY_OFFSET, BODY_SIDES, BODY_VIEWBOX, type BodySide } from './bodyMapPaths';

/** Height over width of the drawing's box. */
const ASPECT = 495.07 / 277.49;

export interface BodyMapProps {
  highlight: Highlight;
  /** Width of each side of the body; the back stands beside the front. */
  width?: number;
  /** Makes every region tappable (the muscle filter). Which muscle a region means is the caller's call. */
  onRegion?: (region: string) => void;
}

/**
 * The body, front and back, with the muscles shaded as the prototype's muscle map: the main one in the
 * strongest heat colour, secondary ones lighter, the rest left plain. Hidden from screen readers: the
 * muscles are always named in text beside it, and the muscle filter lists them as choices too.
 */
export function BodyMap({ highlight, width = 120, onRegion }: BodyMapProps) {
  const { theme } = useUnistyles();
  const fills: Record<RegionShade, string> = {
    primary: theme.heat[4],
    secondary: theme.heat[2],
    none: theme.colors.border,
  };

  const side = (name: string, drawing: BodySide) => (
    <Svg width={width} height={Math.round(width * ASPECT)} viewBox={BODY_VIEWBOX} testID={`body-${name}`}>
      <G transform={`translate(${BODY_OFFSET.x} ${BODY_OFFSET.y})`}>
        {drawing.body.map((d) => (
          <Path key={d} d={d} fill={theme.colors.subtle} />
        ))}
        {Object.entries(drawing.regions).map(([region, paths]) => (
          <G
            key={region}
            testID={`region-${region}`}
            fill={fills[regionShade(region, highlight)]}
            onPress={onRegion && (() => onRegion(region))}
          >
            {paths.map((d) => (
              <Path key={d} d={d} />
            ))}
          </G>
        ))}
      </G>
    </Svg>
  );

  return (
    <View
      testID="body-map"
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {side('front', BODY_SIDES.front)}
      {side('back', BODY_SIDES.back)}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg },
}));
