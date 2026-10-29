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
  /** Floating chrome above cards (the tab bar). */
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
  /** Saved, synced and other good news: a green that never competes with the gold. */
  success: string;
  danger: string;
  dangerSoft: string;
  /** Error and destructive text and icons on the page and cards (in Black plain text: its red is a fill only). */
  dangerText: string;
  /** Text and icons on a `danger` fill (an armed Delete). */
  onDanger: string;
  scrim: string;
  /** Switch knob: white in both schemes, like the platform's own switches. */
  thumb: string;
  /** The card behind the muscle map, then its body (head, hands, joints) and its unselected muscles. */
  bodyCanvas: string;
  bodySilhouette: string;
  bodyMuscle: string;
  /**
   * A muscle's three looks in the muscle cards (this week's map, the history): not hit, hit once, hit
   * twice or more (mockup, MuscleWeek board). In Parchment, darker means more.
   */
  muscleNone: string;
  muscleOnce: string;
  muscleTwice: string;
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
  /** Square keys (icon buttons, the chips): softer than a control's corner on their smaller body. */
  key: number;
  card: number;
  sheet: number;
  pill: number;
  /** Badge corner radius as a fraction of its size. */
  badgeRatio: number;
}

export interface Elevation {
  /** CSS-style box-shadow string (New Architecture), or null for no shadow. */
  card: string | null;
  /** Null in Black: it draws no box-shadow at all (see SoftMaterial). */
  raised: string | null;
}

/**
 * A surface's border "edges" as plain style props. React Native lays a border out inside the view and draws
 * it as part of the view's own background drawable, so an edge costs nothing extra to draw. Black builds its
 * whole material from these (a rim, a ledge under it, a lip along a well's top) instead of box-shadows.
 */
export interface EdgeStyle {
  borderWidth?: number;
  borderColor?: string;
  borderTopWidth?: number;
  borderTopColor?: string;
  borderBottomWidth?: number;
  borderBottomColor?: string;
}

/**
 * One surface of the material: its fill, plus the depth it is drawn with. A surface has a `shadow` (a CSS
 * box-shadow string: Parchment's soft light), `edges` (native borders: Black's hard rim and ledge), or in
 * principle both. Components never read either directly: they ask for `surfaceStyle(look)` (see
 * surfaceStyle.ts), which turns the look into style props.
 */
export interface SurfaceLook {
  background: string;
  /** A box-shadow string. Absent in Black: on Android every boxShadow, outset or inset, is an extra pass. */
  shadow?: string;
  /** Borders that draw the surface's depth where it has no shadow. */
  edges?: EdgeStyle;
}

/** What a raised control becomes under a finger: depth only, no fill of its own. */
export interface PressLook {
  shadow?: string;
  edges?: EdgeStyle;
}

/**
 * The physical material every surface is made of (see materials/soft.ts). `ground` is what the screen is;
 * `raised` and `raisedSm` are lifted out of it, `inset` is pressed into it, and `pressed` is what a raised
 * control becomes under a finger.
 *
 * Depth is spelled two ways, and a scheme uses one of them. Parchment's is soft light, CSS box-shadow strings
 * (New Architecture). Black's is native borders (`edges`) and no shadow at all: Android draws each boxShadow,
 * even a hard one with no blur, as an extra drawable and pass per view, and a screen of cards, keys and wells
 * made the GPU the bottleneck. A border is part of the view's own background drawable.
 */
export interface SoftMaterial {
  ground: string;
  /** Cards, buttons and other large controls. */
  raised: SurfaceLook;
  /** Small controls (icon buttons, ticks): a shallower lift, so depth scales with size. */
  raisedSm: SurfaceLook;
  /** Inputs, wells and selected states: a darker fill AND an inner shadow or lip, so it reads without it. */
  inset: SurfaceLook;
  /** A raised control while held: its lift replaced by a shallow press. */
  pressed: PressLook;
  /**
   * An empty heatmap day: a small dent carved into the card, a darker fill AND fine edges (`edge` pt wide),
   * the shade on its upper left and the light on its lower right. Edges, not inner shadows: Android blurs
   * every inner shadow offscreen, and a month of the training wave holds dozens of empty days.
   */
  carved: { background: string; shade: string; light: string; edge: number };
  /** The tab bar: the material's top layer over scrolling content, parted from the page above it. */
  bar: SurfaceLook;
  /**
   * The gold primary action. `pressed` is its look under a finger, and `edge` is its outline where gold
   * alone would not separate from the ground (a scheme with `edges` of its own draws it there instead).
   */
  accent: AccentLook;
  /**
   * The big gold calls to action (Start workout, Finish workout): `wide` for the tall ones, `narrow` for
   * the shorter. Where a scheme dresses them (Black's engraved face) they carry a `face`; Parchment's are
   * the plain `accent` for both.
   */
  cta: { wide: CtaLook; narrow: CtaLook };
  /**
   * How far a small raised key sinks while held (pt): the key moves down as its ledge gives way. Zero
   * where the material presses a key in with soft inner shadows alone (Parchment).
   */
  keySink: number;
}

/** A gold look with the pressed state and outline it needs. */
export type AccentLook = SurfaceLook & { pressed: PressLook; edge: string | null };

/**
 * What a big gold key carries besides its edges: pictures drawn once by scripts/songket-ground.js (the
 * engraved songket over the whole face, and a soft drop shadow beneath), and the band along the bottom of
 * the face. Every one is shown only while the key stands; a held key has no ledge, band or drop.
 */
export interface CtaFace {
  /** A darker band along the face's bottom, just above the ledge. */
  underside: { color: string; height: number };
  /** The soft drop beneath the key: its picture is stretched across the key, `height` tall. */
  drop: { height: number; opacity: number };
}

export type CtaLook = AccentLook & { face?: CtaFace };

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
