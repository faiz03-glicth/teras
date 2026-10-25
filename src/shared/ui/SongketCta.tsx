import { Image, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { edgeRoom } from '@/theme';

const CTA_MOTIF = require('../../../assets/songket/cta.png') as number;

/** The motif is a row of pucuk rebung over a teluk berantai strip, drawn on a 2pt thread grid. */
export const CTA_MOTIF_WIDTH = 60;
export const CTA_MOTIF_HEIGHT = 48;
const CTA_MOTIF_INSET = 6;
/** Air kept between the label's end and the motif. */
const CTA_MOTIF_GAP = 8;

/** Only the big gold calls to action carry it: Start workout, Finish workout, Done. */
export const CTA_MIN_WIDTH = 200;
export const CTA_MIN_HEIGHT = 48;

/**
 * PURE: whether a gold button has room for the songket motif at its right end. It must be a big button
 * (at least 48pt tall and 200pt wide), and the centred label, once measured, must leave the motif's end
 * clear: the label stays clean, the thread never runs under it.
 */
export function ctaMotifFits(buttonWidth: number, buttonHeight: number, contentWidth: number): boolean {
  if (contentWidth <= 0) return false;
  if (buttonWidth < CTA_MIN_WIDTH || buttonHeight < CTA_MIN_HEIGHT) return false;
  const freeBesideContent = (buttonWidth - contentWidth) / 2;
  return freeBesideContent >= CTA_MOTIF_WIDTH + CTA_MOTIF_INSET + CTA_MOTIF_GAP;
}

/**
 * The darker-gold songket thread pressed into the right end of a big gold button (Black only). A
 * pre-rendered 3x PNG, clipped by the button's own corner radius, never touchable and never read out.
 */
export function SongketCta() {
  return (
    <View pointerEvents="none" style={styles.clip} testID="songket-cta">
      <Image
        source={CTA_MOTIF}
        resizeMode="contain"
        fadeDuration={0}
        accessible={false}
        importantForAccessibility="no"
        style={styles.motif}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Inside the key's edges (its rim and the base it stands on), so the thread lies on the face alone.
  clip: {
    position: 'absolute',
    top: edgeRoom(theme.material.accent).top,
    left: edgeRoom(theme.material.accent).left,
    right: edgeRoom(theme.material.accent).right,
    bottom: edgeRoom(theme.material.accent).bottom,
    borderRadius: theme.radii.control - edgeRoom(theme.material.accent).left,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: CTA_MOTIF_INSET,
  },
  motif: { width: CTA_MOTIF_WIDTH, height: CTA_MOTIF_HEIGHT },
}));
