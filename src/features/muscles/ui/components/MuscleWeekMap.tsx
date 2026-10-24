import { memo } from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  BODY_OFFSET,
  BODY_SIDES,
  BODY_VIEWBOX,
  type BodySide,
} from '@/features/exercises/ui/components/bodyMapPaths';
import { GROUP_OF_REGION } from '@/features/muscles/domain/bodyRegions';
import type { GroupTiers } from '@/features/muscles/domain/muscleCards';

/** The drawing's box (277.49 × 495.07): a side of this width stands this tall. */
const ASPECT = 495.07 / 277.49;
/** Room between the front and the back of the body. */
const SIDE_GAP = 28;
const ORIGIN = `translate(${BODY_OFFSET.x} ${BODY_OFFSET.y})`;

export interface MuscleWeekMapProps {
  tiers: GroupTiers;
  /** The widest each side of the body grows; the back stands beside the front. */
  maxSideWidth?: number;
}

/**
 * The body, front and back, with each muscle shaded by this week's tier of its group: not hit, once, twice
 * or more. One Svg per side, drawn once and only again when a tier changes: nothing on it moves. Each side
 * grows to the room it has (up to `maxSideWidth`) so two fit a narrow phone. The card around it says in
 * words how many muscles were hit twice and which are short.
 */
export const MuscleWeekMap = memo(function MuscleWeekMap({ tiers, maxSideWidth = 140 }: MuscleWeekMapProps) {
  return (
    <View style={styles.row} testID="muscle-week-map">
      <Side name="front" drawing={BODY_SIDES.front} tiers={tiers} maxWidth={maxSideWidth} />
      <Side name="back" drawing={BODY_SIDES.back} tiers={tiers} maxWidth={maxSideWidth} />
    </View>
  );
});

interface SideProps {
  name: string;
  drawing: BodySide;
  tiers: GroupTiers;
  maxWidth: number;
}

const Side = memo(function Side({ name, drawing, tiers, maxWidth }: SideProps) {
  const { theme } = useUnistyles();
  const { muscleNone, muscleOnce, muscleTwice, bodySilhouette } = theme.colors;
  const tierFill = [muscleNone, muscleOnce, muscleTwice] as const;
  return (
    <View style={styles.side(maxWidth)}>
      <Svg width="100%" height="100%" viewBox={BODY_VIEWBOX} testID={`muscle-week-${name}`}>
        <G transform={ORIGIN}>
          {drawing.body.map((d) => (
            <Path key={d} d={d} fill={bodySilhouette} />
          ))}
          {Object.entries(drawing.regions).map(([region, paths]) => {
            const group = GROUP_OF_REGION[region];
            return (
              <G
                key={region}
                testID={`week-region-${region}`}
                fill={group ? tierFill[tiers[group]] : muscleNone}
              >
                {paths.map((d) => (
                  <Path key={d} d={d} />
                ))}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: SIDE_GAP },
  // Both sides share the row, each as wide as the room allows up to its maximum, in the drawing's proportions.
  side: (maxWidth: number) => ({ flex: 1, maxWidth, aspectRatio: 1 / ASPECT }),
});
