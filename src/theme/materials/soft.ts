import type { ColorScheme, SoftMaterial } from '../types';
import { BRAND_GOLD } from '../tokens/brand';
import { semanticColors } from '../tokens/colors';

/** Walnut's lift, shared by cards, keys and the gold: every raised thing is the same flat stuff. */
const WALNUT_LIFT = '-5px -5px 12px rgba(255,236,200,0.085), 6px 6px 14px rgba(0,0,0,0.50)';

/**
 * Teras's material: one physical stuff — parchment by day, walnut by night — that controls are raised out
 * of or pressed into. Light falls from the upper left, so a raised surface carries a highlight up-left and a
 * shade down-right; an inset surface carries the same pair on its inside.
 *
 * Every depth value in the app lives here. Components ask for `raised`, `inset` or `pressed` and never write
 * a shadow of their own, so the whole material can be retuned from this file.
 *
 * Three rules hold the material honest:
 * - **Small and soft.** Offsets stay within 6px and blurs within 16px: a pressed-out object, not a floating
 *   bubble. List rows and the days you trained stay flat; depth is spent on containers and controls, and on
 *   the one exception, an empty heatmap day, carved into its card as a small dent (`carved`).
 * - **Colour carries the state too.** An inset surface is also a darker fill, because inset shadows need
 *   Android 10+, and because no state may be readable only from its shadow.
 * - **The palette is the brand's.** Parchment and walnut come from the semantic colours; the gold is
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
      pressedShadow: 'inset 2px 2px 5px rgba(122,74,18,0.35), inset -2px -2px 5px rgba(255,240,200,0.6)',
      edge: semanticColors.light.accentEdge,
    },
  },
  dark: {
    ground: semanticColors.dark.canvas,
    raised: { background: semanticColors.dark.surface, shadow: WALNUT_LIFT },
    raisedSm: {
      background: semanticColors.dark.surface,
      shadow: '-3px -3px 7px rgba(255,236,200,0.08), 3px 3px 8px rgba(0,0,0,0.48)',
    },
    inset: {
      background: '#221A13',
      shadow: 'inset 3px 3px 7px rgba(0,0,0,0.50), inset -3px -3px 6px rgba(255,236,200,0.07)',
    },
    pressed: {
      shadow: 'inset 3px 3px 6px rgba(0,0,0,0.50), inset -2px -2px 5px rgba(255,236,200,0.07)',
    },
    carved: { background: '#221A13', shade: 'rgba(0,0,0,0.55)', light: 'rgba(255,236,200,0.08)', edge: 1.5 },
    // Its top edge catches the light, and it casts upward onto the content scrolling beneath it.
    bar: {
      background: semanticColors.dark.surface,
      shadow: 'inset 0px 1px 0px rgba(255,236,200,0.07), 0px -6px 14px rgba(0,0,0,0.32)',
    },
    accent: {
      background: BRAND_GOLD,
      // One flat gold, lifted exactly like every other key: no gradient, no glow.
      shadow: WALNUT_LIFT,
      pressedShadow: 'inset 3px 3px 6px rgba(122,74,18,0.50), inset -2px -2px 4px rgba(255,240,200,0.35)',
      // Gold on walnut stands out by itself; an edge here would only add noise.
      edge: null,
    },
  },
};
