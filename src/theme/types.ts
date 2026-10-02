import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
/** 'system' follows the phone's Reduce Motion setting; 'on'/'off' override it for this app. */
export type ReduceMotionPreference = 'system' | 'on' | 'off';
export type HeatPaletteId = 'meadow' | 'ocean' | 'violet' | 'amber';
export type ActivityColorKey = 'green' | 'orange' | 'purple' | 'blue' | 'pink' | 'teal';

/** Heat step index. The theme only knows colours per step; check-in thresholds live in the heatmap domain. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatSteps = readonly [string, string, string, string, string];

export interface SemanticColors {
  canvas: string;
  surface: string;
  /** Floating chrome above cards (tab bar); in dark mode a lighter tone stands in for the shadow. */
  surfaceRaised: string;
  subtle: string;
  border: string;
  border2: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  /** Outline for anything filled with `accent`: the gold is too light to stand alone on parchment. */
  accentEdge: string;
  accentSoft: string;
  accentText: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
  /** Switch knob: white in both schemes, like the platform's own switches. */
  thumb: string;
}

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'title3'
  | 'headline'
  | 'lead'
  | 'body'
  | 'sub'
  | 'footnote'
  | 'caption'
  | 'mini'
  | 'numeric'
  | 'numeric2';

export type TextVariantStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontVariant'
>;

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  gutter: number;
  stack: number;
}

export interface Radii {
  cell: number;
  controlSm: number;
  control: number;
  card: number;
  sheet: number;
  pill: number;
  /** Badge corner radius as a fraction of its size. */
  badgeRatio: number;
}

export interface Elevation {
  /** CSS-style box-shadow string (New Architecture), or null for no shadow. */
  card: string | null;
  raised: string;
}

/**
 * The physical material every surface is made of (see materials/soft.ts). `ground` is what the screen is;
 * `raised` and `raisedSm` are lifted out of it, `inset` is pressed into it, and `pressed` is what a raised
 * control becomes under a finger. Shadows are CSS box-shadow strings (New Architecture).
 */
export interface SoftMaterial {
  ground: string;
  /** Cards, buttons and other large controls. */
  raised: { background: string; shadow: string };
  /** Small controls (icon buttons, ticks): a shallower lift, so depth scales with size. */
  raisedSm: { background: string; shadow: string };
  /** Inputs, wells and selected states: a darker fill AND an inner shadow, so it reads without the shadow. */
  inset: { background: string; shadow: string };
  /** A raised control while held: its lift replaced by a shallow press. */
  pressed: { shadow: string };
  /** The tab bar: the material's top layer over scrolling content, casting a soft shadow upward. */
  bar: { background: string; shadow: string };
  /** The gold primary action. `edge` is its outline where gold alone would not separate from the ground. */
  accent: { background: string; shadow: string; pressedShadow: string; edge: string | null };
}

export interface BrandColors {
  apple: { background: string; foreground: string };
  google: { background: string; foreground: string; border: string };
}

export interface Theme {
  scheme: ColorScheme;
  paletteId: HeatPaletteId;
  colors: SemanticColors;
  activity: Record<ActivityColorKey, string>;
  heat: HeatSteps;
  /** Text printed on each heat colour (the month view's day numbers): the most legible ink per step. */
  heatInk: HeatSteps;
  brand: BrandColors;
  elevation: Elevation;
  /** The soft material: raised, inset and pressed surfaces, one source for every depth in the app. */
  material: SoftMaterial;
  typography: Record<TypographyVariant, TextVariantStyle>;
  fonts: { regular: string; medium: string; semibold: string; bold: string; googleLabel: string };
  spacing: Spacing;
  radii: Radii;
}
