import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';

import type { ShareLook } from '@/features/share/domain/types';

import { CARD_HEIGHT, CARD_WIDTH, CHECKER, PREVIEW_SCALE } from '../cardLooks';

const WIDTH = CARD_WIDTH * PREVIEW_SCALE;
const HEIGHT = CARD_HEIGHT * PREVIEW_SCALE;
const PATTERN = 'share-checker';

/** The usual sign for "transparent": two flat greys in squares. A pattern, not a gradient. */
function Checkerboard() {
  const { size } = CHECKER;
  return (
    <Svg width={WIDTH} height={HEIGHT} style={styles.fill} testID="share-checkerboard">
      <Defs>
        <Pattern id={PATTERN} width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
          <Rect width={size} height={size} fill={CHECKER.square} />
          <Rect x={size} y={size} width={size} height={size} fill={CHECKER.square} />
        </Pattern>
      </Defs>
      <Rect width={WIDTH} height={HEIGHT} fill={CHECKER.base} />
      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${PATTERN})`} />
    </Svg>
  );
}

/**
 * The picture, smaller than it is: the card is drawn at the size it is shared at and scaled down here, so
 * what is captured is exactly what is shown. A Clear picture sits on a checkerboard, since its ground is
 * transparent.
 */
export function SharePreview({ look, children }: { look: ShareLook; children: ReactNode }) {
  return (
    <View style={styles.stage} testID="share-preview">
      {look === 'clear' && <Checkerboard />}
      <View style={styles.scaled}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stage: {
    width: WIDTH,
    height: HEIGHT,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: theme.radii.controlSm + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fill: { position: 'absolute', top: 0, left: 0 },
  scaled: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    transform: [{ scale: PREVIEW_SCALE }],
    transformOrigin: 'top left',
  },
}));
