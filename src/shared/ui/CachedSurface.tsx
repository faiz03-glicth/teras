import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PrerenderedSurface, styleList } from './PrerenderedSurface';

/**
 * Room around a surface for its drop shadow, which a cached view would otherwise clip: 'card' for the raised
 * material (offsets to 6pt, blurs to 14pt), 'key' for a small key (raisedSm: 3 + 8), 'none' for a well,
 * whose inset shadow stays inside it.
 */
const BLEED = { card: 24, key: 12, none: 0 } as const;
export type SurfaceBleed = keyof typeof BLEED;

/**
 * A surface's look (fill, shadows and edges: pass `surfaceStyle(material.X)` as `style`) drawn on its own,
 * behind the parent's content.
 * On Android a box shadow is blurred again on every draw: here each shadow is drawn once into a bitmap and
 * stretched to the surface (PrerenderedSurface), so a scroll, a screen slide or a screen coming back costs
 * no blur. A shadowed surface that can't be drawn that way (an edge) is a plain view cached once into a
 * texture. A surface with no shadow (Black's: its depth is borders, drawn with the view's own background)
 * is a plain view with no layer at all. The content above stays live. On iOS a plain view in the same frame.
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
    <PrerenderedSurface frame={frame(BLEED[bleed])} style={styleList([styles[`${bleed}Surface`], style])} />
  );
}

/** The surface's frame: the parent's box and the bleed around it, taking no space. */
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
  cardSurface: surface(BLEED.card),
  keySurface: surface(BLEED.key),
  noneSurface: surface(BLEED.none),
});
