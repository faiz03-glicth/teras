import type { ColorScheme, EdgeStyle, SoftMaterial } from '../types';
import { BRAND_GOLD } from '../tokens/brand';
import { semanticColors } from '../tokens/colors';

/**
 * Black's greys, named for the part of a surface they draw. Every one is a native border colour: the rim
 * round a card, the dark base it stands on, a well's outline and the lip along its top.
 */
const RIM = '#2E2E33';
const LEDGE = '#050506';
const WELL_RIM = '#34343A';
const WELL_LIP = '#141416';
/** The shade a held control casts on its own top edge: black at the strength the old inner shadow had. */
const PRESS_SHADE = 'rgba(0,0,0,0.55)';
const GOLD_PRESS_SHADE = 'rgba(122,74,18,0.55)';

/** A raised thing: a 1px rim all round, and below it a hard ledge `ledge` thick, its base. */
const standing = (ledge: number): EdgeStyle => ({
  borderWidth: 1,
  borderColor: RIM,
  borderBottomWidth: ledge,
  borderBottomColor: LEDGE,
});

/** A raised thing held down: no ledge any more, just its rim and a darker shade along the top. */
const pressedIn = (rim: string, shade: string): EdgeStyle => ({
  borderWidth: 1,
  borderColor: rim,
  borderTopWidth: 2,
  borderTopColor: shade,
  borderBottomWidth: 1,
  borderBottomColor: rim,
});

/**
 * Teras's material, one per scheme.
 *
 * **Parchment (light)** is one soft stuff that controls are raised out of or pressed into. Light falls from
 * the upper left, so a raised surface carries a highlight up-left and a shade down-right; an inset surface
 * carries the same pair on its inside. Its depth is box-shadow.
 *
 * **Black (dark)** is flat: no blur, no glow, no gradient, and NO box-shadow at all. A solid graphite
 * surface with a 1px rim, and raised things stand on a hard ledge below them (a game button's base, not a
 * soft shadow). Pressing drops the ledge. A well is a flat step LIGHTER than the card it sits in, with a hard
 * lip along its top. All of it is drawn with native borders (`edges`), inside the view.
 *
 * Why borders and not box-shadows: Android draws every boxShadow, outset or inset and even with zero blur, as
 * an extra drawable and render pass per view. A screen of cards, keys and wells made the GPU the bottleneck
 * (6.7% of frames late, a 152 ms worst, on a MediaTek GPU). A border is part of the view's own background
 * drawable: the fill and its edges are one draw. Edges lie inside the view's box, so what stood outside it as
 * a ledge now takes its share of the box's height (a control's size is unchanged; its face is a little
 * shorter).
 *
 * Every depth value in the app lives here. Components ask for `raised`, `inset` or `pressed` through
 * `surfaceStyle` and never write a shadow or a border of their own, so the whole material can be retuned from
 * this file.
 *
 * Three rules hold the material honest:
 * - **Small.** Offsets stay within 6px and blurs within 16px (Black has none): a pressed-out object, not a
 *   floating bubble. List rows and the days you trained stay flat; depth is spent on containers and controls,
 *   and on the one exception, an empty heatmap day, carved into its card as a small dent (`carved`).
 * - **Colour carries the state too.** An inset surface is also a different fill, because inset shadows need
 *   Android 10+, and because no state may be readable only from its shadow.
 * - **The palette is the brand's.** Parchment and Black come from the semantic colours; the gold is
 *   BRAND_GOLD in both schemes. On parchment the gold keeps its dark edge: gold on cream separates by
 *   barely 1.2:1, and the edge is what makes the button an object rather than a stain.
 */
export const softMaterials: Record<ColorScheme, SoftMaterial> = {
  light: {
    ground: semanticColors.light.canvas,
    raised: {
      background: '#FAEDC2',
      shadow: '-5px -5px 12px rgba(255,251,235,0.95), 5px 5px 14px rgba(122,86,30,0.30)',
    },
    raisedSm: {
      background: '#FAEDC2',
      shadow: '-3px -3px 7px rgba(255,251,235,0.9), 3px 3px 8px rgba(122,86,30,0.28)',
    },
    inset: {
      background: '#ECD9A0',
      shadow: 'inset 3px 3px 6px rgba(122,86,30,0.28), inset -3px -3px 6px rgba(255,251,235,0.9)',
    },
    pressed: {
      shadow: 'inset 2px 2px 5px rgba(122,86,30,0.24), inset -2px -2px 5px rgba(255,251,235,0.75)',
    },
    carved: {
      background: '#ECD9A0',
      shade: 'rgba(122,86,30,0.32)',
      light: 'rgba(255,251,235,0.9)',
      edge: 1.5,
    },
    bar: { background: '#FAEDC2', shadow: '0px -4px 12px rgba(122,86,30,0.16)' },
    accent: {
      background: BRAND_GOLD,
      shadow: '-4px -4px 10px rgba(255,251,235,0.9), 4px 4px 12px rgba(122,74,18,0.40)',
      pressed: {
        shadow: 'inset 2px 2px 5px rgba(122,74,18,0.35), inset -2px -2px 5px rgba(255,240,200,0.6)',
      },
      edge: semanticColors.light.accentEdge,
    },
  },
  dark: {
    ground: semanticColors.dark.canvas,
    raised: { background: '#1B1B1E', edges: standing(3) },
    raisedSm: { background: '#1B1B1E', edges: standing(2) },
    // A well: its outline, and a hard lip along the top where the card's edge overhangs it.
    inset: {
      background: '#26262B',
      edges: { borderWidth: 1, borderColor: WELL_RIM, borderTopWidth: 2, borderTopColor: WELL_LIP },
    },
    pressed: { edges: pressedIn(WELL_RIM, PRESS_SHADE) },
    // An empty day is a flat well a step lighter than the card, outlined in the border grey: no blur, no glow.
    carved: { background: '#26262B', shade: '#34343A', light: '#34343A', edge: 1 },
    bar: { background: '#141416', edges: { borderTopWidth: 1, borderTopColor: RIM } },
    accent: {
      background: BRAND_GOLD,
      // The same darker gold all round, thickest below: the key stands on its base like a game button.
      edges: {
        borderWidth: 1,
        borderColor: semanticColors.dark.accentEdge,
        borderBottomWidth: 3,
        borderBottomColor: semanticColors.dark.accentEdge,
      },
      pressed: { edges: pressedIn(semanticColors.dark.accentEdge, GOLD_PRESS_SHADE) },
      edge: semanticColors.dark.accentEdge,
    },
  },
};
