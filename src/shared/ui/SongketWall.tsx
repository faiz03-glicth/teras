import { memo } from 'react';
import { Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const WALL_DARK = require('../../../assets/songket/wall-dark.png') as number;
const WALL_LIGHT = require('../../../assets/songket/wall-light.png') as number;

/**
 * The faint songket (woven gold thread) wallpaper behind a screen: gold in Black, ink in Parchment.
 * A pre-rendered 3x PNG, not SVG paths: the decoded bitmap is drawn once and costs nothing per frame.
 * Put one at the back of each screen, never one per row. It sits beside the scrolling content rather
 * than in it, and nothing here depends on scroll, so scrolling never renders it again.
 */
export const SongketWall = memo(function SongketWall() {
  const { theme } = useUnistyles();
  return (
    <Image
      source={theme.scheme === 'dark' ? WALL_DARK : WALL_LIGHT}
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
