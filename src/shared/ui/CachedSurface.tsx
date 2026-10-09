import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/**
 * Room around a surface for its drop shadow, which a cached view would otherwise clip: 'card' for the raised
 * material (offsets to 6pt, blurs to 14pt), 'key' for a small key (raisedSm: 3 + 8), 'none' for a well,
 * whose inset shadow stays inside it.
 */
const BLEED = { card: 24, key: 12, none: 0 } as const;
export type SurfaceBleed = keyof typeof BLEED;

/**
 * A surface's look (fill and shadows: pass them as `style`) drawn on its own, behind the parent's content,
 * once into a texture that's reused. On Android a box shadow is blurred again on every frame its view moves
 * (a scroll, every screen slide); as a still texture it costs nothing. The content above stays live.
 * collapsable={false} keeps the view, so the cache isn't flattened away. No effect on iOS.
 *
 * The parent: no fill or shadow of its own, and this as its first child (it lies exactly on the parent).
 */
export function CachedSurface({
  style,
  bleed = 'card',
}: {
  style: StyleProp<ViewStyle>;
  bleed?: SurfaceBleed;
}) {
  return (
    <View
      style={styles[`${bleed}Frame`]}
      pointerEvents="none"
      collapsable={false}
      renderToHardwareTextureAndroid
      testID="cached-surface"
    >
      <View style={[styles[`${bleed}Surface`], style]} />
    </View>
  );
}

/** The cached view: the parent's box and the bleed around it, taking no space. */
const frame = (bleed: number) => ({
  position: 'absolute' as const,
  top: -bleed,
  right: -bleed,
  bottom: -bleed,
  left: -bleed,
});
/** The surface itself, exactly on the parent's box. */
const surface = (bleed: number) => ({
  position: 'absolute' as const,
  top: bleed,
  right: bleed,
  bottom: bleed,
  left: bleed,
});

const styles = StyleSheet.create({
  cardFrame: frame(BLEED.card),
  cardSurface: surface(BLEED.card),
  keyFrame: frame(BLEED.key),
  keySurface: surface(BLEED.key),
  noneFrame: frame(BLEED.none),
  noneSurface: surface(BLEED.none),
});
