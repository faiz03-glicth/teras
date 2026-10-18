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
  return (
    <View
      style={frame}
      pointerEvents="none"
      collapsable={false}
      // Drawn from bitmaps, the surface costs little to draw again, less than rebuilding a cached layer
      // whenever its screen comes back. A surface left to React Native keeps the cache.
      renderToHardwareTextureAndroid={!lib || !look}
      testID="cached-surface"
    >
      {lib && look ? (
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
 * with the same style; a surface it can't draw that way (an edge, uneven corners) stays a View in a
 * cached layer, as before. withUnistyles re-renders it when the theme changes, since its props are not
 * styles Unistyles can update by itself.
 */
export const PrerenderedSurface = withUnistyles(Surface);
