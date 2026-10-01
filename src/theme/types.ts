import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
/** 'system' follows the phone's Reduce Motion setting; 'on'/'off' override it for this app. */
export type ReduceMotionPreference = 'system' | 'on' | 'off';
export type VisualStyle = 'glass' | 'classic';
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

export interface GlassMaterial {
  /**
   * The canvas behind every screen: soft glows of green and blue over `canvasBase`, as CSS
   * `radial-gradient` layers (React Native draws them natively on iOS and Android).
   */
  backdrop: string;
  /** `shadow`: a lit top edge and a soft drop, so a translucent card reads as a pane of glass. */
  card: { background: string; edge: string; shadow: string };
  /** The primary button's inner light and green glow. */
  accentShadow: string;
  strong: string;
  tint: string;
  /**
   * The floating tab bar: a frosted layer over the content (`blur`, 0–100) under a translucent `tint`, lit
   * along its top (`highlight`, a CSS gradient) and edged like the cards. Only this bar and toasts blur:
   * they're small, and blur costs a pass over what's behind them every frame the content moves.
   * `edgeLight` is the lit rim (inset lines, drawn above the frost); `shadow` the drop below the bar.
   */
  tabBar: { tint: string; blur: number; highlight: string; edgeLight: string; shadow: string };
  /** The + button: lit from inside (`highlight`, a CSS gradient over the green), a frosted `ring`, a green glow. */
  fab: { highlight: string; ring: string; shadow: string };
  /** The active-tab highlight that slides between tabs. */
  pill: string;
  sheet: { tint: string; blur: number };
  toast: { background: string; foreground: string; blur: number };
  canvasBase: string;
  heatEmpty: string;
}

export interface BrandColors {
  apple: { background: string; foreground: string };
  google: { background: string; foreground: string; border: string };
}

export interface Theme {
  scheme: ColorScheme;
  style: VisualStyle;
  paletteId: HeatPaletteId;
  colors: SemanticColors;
  activity: Record<ActivityColorKey, string>;
  heat: HeatSteps;
  /** Text printed on each heat colour (the month view's day numbers): the most legible ink per step. */
  heatInk: HeatSteps;
  brand: BrandColors;
  elevation: Elevation;
  /** Present only when the Liquid Glass style is active. */
  glass: GlassMaterial | null;
  typography: Record<TypographyVariant, TextVariantStyle>;
  fonts: { regular: string; medium: string; semibold: string; bold: string; googleLabel: string };
  spacing: Spacing;
  radii: Radii;
}
