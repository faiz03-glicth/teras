import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ComponentType } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { withUnistyles } from 'react-native-unistyles';

import { toPrerenderedLook, type NativeShadow } from './prerenderedLook';

interface NativeProps {
  style: ViewStyle;
  fill: number;
  radius: number;
  shadows: NativeShadow[];
}

interface NativeSurface {
  View: ComponentType<NativeProps>;
}

let native: NativeSurface | null | undefined;

/**
 * The native view (modules/prerendered-surface), once, and only on Android in a build that has it: iOS
 * draws its shadows without re-blurring, and a build made before the module was added would crash.
 */
function loadNative(): NativeSurface | null {
  if (native !== undefined) return native;
  native =
    Platform.OS === 'android' && requireOptionalNativeModule('PrerenderedSurface')
      ? { View: requireNativeView<NativeProps>('PrerenderedSurface') }
      : null;
  return native;
}

/** Every style in a style prop, nested arrays and all, in order; each keeps its Unistyles binding. */
export function styleList(style: StyleProp<ViewStyle>): ViewStyle[] {
  if (!style) return [];
  if (!Array.isArray(style)) return [style as ViewStyle];
  return (style as readonly StyleProp<ViewStyle>[]).flatMap((item) => styleList(item));
}

interface SurfaceProps {
  /** The box around the surface with room for its shadow (CachedSurface's frame). */
  frame: ViewStyle;
  style?: StyleProp<ViewStyle>;
}

function Surface({ frame, style }: SurfaceProps) {
  const lib = loadNative();
  // withUnistyles hands one merged style already; merging again is a no-op there and covers tests.
  const merged: ViewStyle = Object.assign({}, ...styleList(style));
  const look = lib ? toPrerenderedLook(merged) : null;
  // Only a box-shadow is worth caching. A surface with none (Black draws its depth as borders, part of the
  // view's own background drawable) is cheaper drawn live than composited from a layer of its own.
  const shadowed = merged.boxShadow !== undefined;
  const prerendered = look !== null && look.shadows.length > 0;
  return (
    <View
      style={frame}
      pointerEvents="none"
      collapsable={false}
      // Drawn from bitmaps, the surface costs little to draw again, less than rebuilding a cached layer
      // whenever its screen comes back. A shadowed surface left to React Native keeps the cache.
      renderToHardwareTextureAndroid={shadowed && !(lib && prerendered)}
      testID="cached-surface"
    >
      {lib && look && prerendered ? (
        <lib.View style={look.style} fill={look.fill} radius={look.radius} shadows={look.shadows} />
      ) : (
        <View style={merged} />
      )}
    </View>
  );
}

/**
 * A surface's fill and box shadows drawn from bitmaps rendered once per shadow and size class (see
 * ShadowTiles.kt), not blurred again on every draw, inside CachedSurface's frame. Same look as a View
 * with the same style; a shadowed surface it can't draw that way (an edge, uneven corners) stays a View in
 * a cached layer, as before. A surface with no shadow at all (Black's, drawn with borders) stays a plain
 * View with no layer: its fill and edges are one background drawable. withUnistyles re-renders it when the
 * theme changes, since its props are not styles Unistyles can update by itself.
 */
export const PrerenderedSurface = withUnistyles(Surface);
