import { processColor, type BoxShadowValue, type ViewStyle } from 'react-native';

/** One shadow of a box-shadow list, as the native PrerenderedSurface takes it: lengths in dp. */
export interface NativeShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  /** processColor's value: on Android a signed 32-bit ARGB. */
  color: number;
  inset: boolean;
}

/** What PrerenderedSurface draws, and the style left for the view itself (its layout). */
export interface PrerenderedLook {
  fill: number;
  radius: number;
  shadows: NativeShadow[];
  style: ViewStyle;
}

// React Native's own patterns (processBoxShadow.js), so a string reads here exactly as it reads there.
const COMMA_SPLIT = /,(?![^()]*\))/;
const WHITESPACE_SPLIT = /\s+(?![^(]*\))/;
const LENGTH = /^([+-]?\d*\.?\d+)(px)?$/;
const NEWLINES = /\n/g;

/** Android draws a shadow with no colour in black (BoxShadow.parse). */
const DEFAULT_SHADOW_COLOR = 'black';

/**
 * A box-shadow string read as React Native reads it (processBoxShadow): per shadow two to four lengths
 * together (x, y, blur, spread), an optional colour and an optional `inset`. One malformed shadow voids the
 * whole list, as there: it draws none.
 */
export function parseBoxShadow(value: string): NativeShadow[] {
  const shadows: NativeShadow[] = [];
  const parts = value
    .replace(NEWLINES, ' ')
    .split(COMMA_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part !== '');
  for (const part of parts) {
    const shadow = parseOne(part.split(WHITESPACE_SPLIT));
    if (!shadow) return [];
    shadows.push(shadow);
  }
  return shadows;
}

function parseOne(args: readonly string[]): NativeShadow | null {
  const lengths: string[] = [];
  let color: number | undefined;
  let inset = false;
  // A colour or `inset` may come before the lengths or after them, never between.
  let keywordAfterLength = false;
  for (const arg of args) {
    const processed = processColor(arg);
    if (processed != null) {
      if (color !== undefined || typeof processed !== 'number') return null;
      if (lengths.length > 0) keywordAfterLength = true;
      color = processed;
    } else if (arg === 'inset') {
      if (inset) return null;
      if (lengths.length > 0) keywordAfterLength = true;
      inset = true;
    } else {
      if (lengths.length >= 4 || (lengths.length > 0 && keywordAfterLength)) return null;
      lengths.push(arg);
    }
  }
  const [offsetX, offsetY, blur = 0, spread = 0] = lengths.map(parseLength);
  if (offsetX == null || offsetY == null || blur == null || spread == null || blur < 0) return null;
  const black = processColor(DEFAULT_SHADOW_COLOR) as number;
  return { offsetX, offsetY, blur, spread, color: color ?? black, inset };
}

/**
 * A box-shadow list given as objects, read as React Native reads them (processBoxShadow): lengths as numbers
 * or px strings, the colour black if none. Unistyles hands a style's shadows over in this form, having
 * parsed the material's strings itself. One malformed shadow voids the whole list, as there.
 */
export function fromBoxShadowValues(values: readonly BoxShadowValue[]): NativeShadow[] {
  const shadows: NativeShadow[] = [];
  for (const value of values) {
    const offsetX = toLength(value.offsetX);
    const offsetY = toLength(value.offsetY);
    const blur = value.blurRadius === undefined ? 0 : toLength(value.blurRadius);
    const spread = value.spreadDistance === undefined ? 0 : toLength(value.spreadDistance);
    const color = processColor(value.color ?? DEFAULT_SHADOW_COLOR);
    if (offsetX == null || offsetY == null || blur == null || spread == null || blur < 0) return [];
    if (typeof color !== 'number') return [];
    shadows.push({ offsetX, offsetY, blur, spread, color, inset: value.inset === true });
  }
  return shadows;
}

function toLength(length: number | string): number | null {
  return typeof length === 'number' ? length : parseLength(length);
}

/** React Native's parseLength: a number in px, the unit optional only for 0. */
function parseLength(length: string): number | null {
  const match = LENGTH.exec(length);
  if (!match) return null;
  const value = Number.parseFloat(match[1] ?? '');
  if (match[2] == null && value !== 0) return null;
  return value;
}

const WIDTH_KEYS = [
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStartWidth',
  'borderEndWidth',
] as const;

const CORNER_KEYS = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderStartStartRadius',
  'borderStartEndRadius',
  'borderEndStartRadius',
  'borderEndEndRadius',
] as const;

/**
 * A surface's fill, corners and shadows as PrerenderedSurface draws them, or null where it would not draw
 * them as React Native does: an edge (React Native draws it, and insets inner shadows by it), or corners
 * not all one number. Those stay plain views.
 */
export function toPrerenderedLook(style: ViewStyle): PrerenderedLook | null {
  const { backgroundColor, borderRadius = 0, boxShadow, ...rest } = style;
  if (WIDTH_KEYS.some((key) => typeof style[key] === 'number' && style[key] > 0)) return null;
  if (CORNER_KEYS.some((key) => style[key] !== undefined)) return null;
  if (typeof borderRadius !== 'number') return null;
  const fill = backgroundColor === undefined ? 0 : processColor(backgroundColor);
  if (typeof fill !== 'number') return null;
  const shadows =
    boxShadow === undefined
      ? []
      : typeof boxShadow === 'string'
        ? parseBoxShadow(boxShadow)
        : fromBoxShadowValues(boxShadow);
  return { fill, radius: borderRadius, shadows, style: rest };
}
