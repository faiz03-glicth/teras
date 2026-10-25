import { memo } from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';

import { regionShade, type Highlight } from '@/features/exercises/domain/bodyMap';
import {
  BODY_OFFSET,
  BODY_SIDES,
  BODY_VIEWBOX,
  type BodySide,
} from '@/features/exercises/ui/components/bodyMapPaths';

import type { CardLook } from '../cardLooks';

/** Height over width of the drawing's box (277.49 × 495.07). */
const ASPECT = 495.07 / 277.49;
const ORIGIN = `translate(${BODY_OFFSET.x} ${BODY_OFFSET.y})`;
const SIDE_GAP = 16;

export interface ShareBodyProps {
  highlight: Highlight;
  colors: CardLook['body'];
  /** Width of each side of the body; the back stands beside the front. */
  sideWidth: number;
}

/**
 * The body, front and back, in the picture's own colours: the main muscles in the strongest shade,
 * the helping ones in the lighter, the rest left plain. It is the app's muscle-map drawing (the same
 * paths and the same region-to-muscle rule), drawn flat and still, because a picture does not move.
 */
export const ShareBody = memo(function ShareBody({ highlight, colors, sideWidth }: ShareBodyProps) {
  const height = Math.round(sideWidth * ASPECT);
  return (
    <View style={styles.row} testID="share-body">
      <Side name="front" drawing={BODY_SIDES.front} {...{ highlight, colors, width: sideWidth, height }} />
      <Side name="back" drawing={BODY_SIDES.back} {...{ highlight, colors, width: sideWidth, height }} />
    </View>
  );
});

interface SideProps {
  name: string;
  drawing: BodySide;
  highlight: Highlight;
  colors: CardLook['body'];
  width: number;
  height: number;
}

function Side({ name, drawing, highlight, colors, width, height }: SideProps) {
  return (
    <Svg width={width} height={height} viewBox={BODY_VIEWBOX} testID={`share-body-${name}`}>
      <G transform={ORIGIN}>
        {drawing.body.map((d) => (
          <Path key={d} d={d} fill={colors.silhouette} />
        ))}
        {Object.entries(drawing.regions).map(([region, paths]) => {
          const shade = regionShade(region, highlight);
          const fill = shade === 'none' ? colors.muscle : colors[shade];
          return (
            <G key={region} testID={`share-region-${region}`} fill={fill}>
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

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: SIDE_GAP } });
