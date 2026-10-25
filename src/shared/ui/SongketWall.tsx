import { memo } from 'react';
import { Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// Opaque: the woven thread already blended onto the scheme's canvas (scripts/songket-ground.js).
const GROUND_DARK = require('../../../assets/songket/ground-dark.png') as number;
const GROUND_LIGHT = require('../../../assets/songket/ground-light.png') as number;

/**
 * The songket (woven gold thread) ground behind a screen: gold in Black, ink in Parchment. It IS the screen's
 * background, not a layer over it: an opaque, canvas-coloured image with the thread already in it, so it is
 * drawn with no blending (a full-screen blend on every frame is what a mobile GPU is slowest at). The
 * navigator's scene keeps its plain canvas fill, which shows for the instant before this image decodes.
 * A pre-rendered 3x PNG, not SVG paths: the decoded bitmap is drawn once and costs nothing per frame.
 * Put one at the back of each screen, never one per row. It sits beside the scrolling content rather
 * than in it, and nothing here depends on scroll, so scrolling never renders it again.
 */
export const SongketWall = memo(function SongketWall() {
  const { theme } = useUnistyles();
  return (
    <Image
      source={theme.scheme === 'dark' ? GROUND_DARK : GROUND_LIGHT}
      resizeMode="cover"
      // Decorative, and no fade-in: the thread is part of the ground, not something that arrives.
      fadeDuration={0}
      accessible={false}
      importantForAccessibility="no"
      style={styles.wall}
      testID="songket-wall"
    />
  );
});

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
});
