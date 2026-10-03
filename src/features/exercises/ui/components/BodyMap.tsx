import { memo } from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { regionShade, type Highlight } from '@/features/exercises/domain/bodyMap';
import { ContentSwap } from '@/shared/ui';

import { BODY_OFFSET, BODY_SIDES, BODY_VIEWBOX, type BodySide } from './bodyMapPaths';

/** Height over width of the drawing's box. */
const ASPECT = 495.07 / 277.49;
const ORIGIN = `translate(${BODY_OFFSET.x} ${BODY_OFFSET.y})`;

export interface BodyMapProps {
  highlight: Highlight;
  /** Width of each side of the body; the back stands beside the front. */
  width?: number;
  /** Makes every region tappable (the muscle filter). Which muscle a region means is the caller's call. */
  onRegion?: (region: string) => void;
}

/**
 * The body, front and back, with the muscles shaded as the prototype's muscle map: the main one in the
 * strongest heat colour, secondary ones lighter, the rest left plain. The plain body is drawn once; the
 * shading lies over it and cross-fades when the muscles change, so a new pick eases in rather than
 * snapping. Hidden from screen readers: the muscles are always named in text beside it, and the muscle
 * filter lists them as choices too.
 */
export function BodyMap({ highlight, width = 120, onRegion }: BodyMapProps) {
  const height = Math.round(width * ASPECT);
  const shaded = highlight.primary.length + highlight.secondary.length > 0;
  return (
    <View testID="body-map" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.row}>
        <PlainSide
          name="front"
          drawing={BODY_SIDES.front}
          width={width}
          height={height}
          onRegion={onRegion}
        />
        <PlainSide name="back" drawing={BODY_SIDES.back} width={width} height={height} onRegion={onRegion} />
      </View>
      <ContentSwap id={[...highlight.primary, '/', ...highlight.secondary].join(' ')} style={styles.shading}>
        {shaded && (
          <>
            <Shading drawing={BODY_SIDES.front} width={width} height={height} highlight={highlight} />
            <Shading drawing={BODY_SIDES.back} width={width} height={height} highlight={highlight} />
          </>
        )}
      </ContentSwap>
    </View>
  );
}

interface SideProps {
  drawing: BodySide;
  width: number;
  height: number;
}

/** One side with every muscle plain, tappable when the map is a filter. Never redrawn for a new pick. */
const PlainSide = memo(function PlainSide({
  name,
  drawing,
  width,
  height,
  onRegion,
}: SideProps & { name: string; onRegion?: (region: string) => void }) {
  const { theme } = useUnistyles();
  return (
    <Svg width={width} height={height} viewBox={BODY_VIEWBOX} testID={`body-${name}`}>
      <G transform={ORIGIN}>
        {drawing.body.map((d) => (
          <Path key={d} d={d} fill={theme.colors.bodySilhouette} />
        ))}
        {Object.entries(drawing.regions).map(([region, paths]) => (
          <G
            key={region}
            testID={`region-${region}`}
            fill={theme.colors.bodyMuscle}
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
});

/** Only the highlighted muscles of one side, in their heat colours, to lie over the plain side. */
function Shading({ drawing, width, height, highlight }: SideProps & { highlight: Highlight }) {
  const { theme } = useUnistyles();
  const fills = { primary: theme.heat[4], secondary: theme.heat[2] };
  return (
    <Svg width={width} height={height} viewBox={BODY_VIEWBOX}>
      <G transform={ORIGIN}>
        {Object.entries(drawing.regions).map(([region, paths]) => {
          const shade = regionShade(region, highlight);
          if (shade === 'none') return null;
          return (
            <G key={region} testID={`highlight-${region}`} fill={fills[shade]}>
              {paths.map((d) => (
                <Path key={d} d={d} />
              ))}
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg },
  // Laid exactly over the plain row, and never in the way of a tap on it.
  shading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    pointerEvents: 'none',
  },
}));
