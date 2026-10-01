import { requireOptionalNativeModule } from 'expo';
import type { ReactNode, RefObject } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorScheme } from '@/theme';

type ExpoBlur = typeof import('expo-blur');

let blur: ExpoBlur | null | undefined;

/**
 * expo-blur, once, and only if this build of the app has its native module: a development build made
 * before it was added would crash on import. Without it, glass surfaces keep their tint (no blur) until the
 * next build.
 */
function loadBlur(): ExpoBlur | null {
  if (blur !== undefined) return blur;
  blur = requireOptionalNativeModule('ExpoBlur')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see above
      (require('expo-blur') as ExpoBlur)
    : null;
  return blur;
}

export interface BlurTargetProps {
  /** Handed to the glass surfaces that frost this content (their `target`). */
  targetRef: RefObject<View | null>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * What glass surfaces blur (Android draws the blur from this view's content; iOS blurs whatever is behind
 * on its own). Wrap the content that scrolls under a frosted surface, never the surface itself.
 */
export function BlurTarget({ targetRef, children, style }: BlurTargetProps) {
  const lib = loadBlur();
  if (!lib) {
    return (
      <View ref={targetRef} style={style} collapsable={false}>
        {children}
      </View>
    );
  }
  return (
    <lib.BlurTargetView ref={targetRef} style={style}>
      {children}
    </lib.BlurTargetView>
  );
}

export interface GlassBlurProps {
  /** 0–100. */
  intensity: number;
  scheme: ColorScheme;
  /** The BlurTarget whose content this frosts (Android). */
  target?: RefObject<View | null>;
  style?: StyleProp<ViewStyle>;
}

/**
 * The frosted layer of a glass surface: a real blur of what's behind it. On Android it's the RenderNode
 * blur, used only on Android 12+ (older versions would fall back to a much slower method, so they get the
 * tint alone). Nothing renders when blur isn't available; the surface's tint carries it.
 */
export function GlassBlur({ intensity, scheme, target, style }: GlassBlurProps) {
  const lib = loadBlur();
  if (!lib) return null;
  return (
    <lib.BlurView
      intensity={intensity}
      tint={scheme}
      blurTarget={target}
      blurMethod="dimezisBlurViewSdk31Plus"
      pointerEvents="none"
      style={style}
    />
  );
}
