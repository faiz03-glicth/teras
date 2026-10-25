import type { EdgeStyle, PressLook, SoftMaterial, SurfaceLook } from './types';

/**
 * The style props a look can set: a fill, a box-shadow and border edges. Narrower than ViewStyle on purpose, so
 * a component spreads it straight into a Unistyles stylesheet.
 */
export interface SurfaceStyle extends EdgeStyle {
  backgroundColor?: string;
  boxShadow?: string;
}

/** A look's box-shadow alone, if the scheme draws its depth that way: for a surface that edges itself. */
export function shadowStyle({ shadow }: PressLook): SurfaceStyle {
  return shadow === undefined ? {} : { boxShadow: shadow };
}

/** The depth of a surface alone: its box-shadow, if the scheme draws depth that way, and its edges. */
export function depthStyle(look: PressLook): SurfaceStyle {
  return { ...shadowStyle(look), ...look.edges };
}

/**
 * A material surface as style props: its fill, then its depth (`depthStyle`). Every component that draws a
 * piece of the material spreads this instead of reading `material.X.shadow` itself, so a scheme can spell its
 * depth as shadows (Parchment) or as native borders (Black) without a component knowing. Keys the look does
 * not have are left out, so no style carries an `undefined`.
 */
export function surfaceStyle(look: Partial<SurfaceLook>): SurfaceStyle {
  return { ...(look.background !== undefined && { backgroundColor: look.background }), ...depthStyle(look) };
}

/**
 * The gold primary action as style props. Where the scheme gives the gold edges of its own (Black) they draw
 * its rim and base; where it gives only an outline colour (Parchment) the gold is outlined in it, `outline`
 * wide.
 */
export function accentStyle(accent: SoftMaterial['accent'], outline = 1): SurfaceStyle {
  const style = surfaceStyle(accent);
  if (accent.edges || accent.edge === null) return style;
  return { ...style, borderWidth: outline, borderColor: accent.edge };
}

/**
 * How much deeper a look's bottom edge is than its top: the ledge a raised key stands on, inside its box.
 * Padding a key's content by it below centres the content on the key's face rather than on its box.
 */
export function faceLift(look: { edges?: EdgeStyle }): number {
  const room = edgeRoom(look);
  return Math.max(0, room.bottom - room.top);
}

/** The room a look's edges take inside a view's box on each side (React Native lays borders out inside it). */
export function edgeRoom(look: { edges?: EdgeStyle }): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const { borderWidth = 0, borderTopWidth = borderWidth, borderBottomWidth = borderWidth } = look.edges ?? {};
  return { top: borderTopWidth, right: borderWidth, bottom: borderBottomWidth, left: borderWidth };
}
