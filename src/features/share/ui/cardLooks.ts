import type { ShareLook } from '../domain/types';

/**
 * The picture is a fixed design, not a screen: it looks the same whatever the app's theme, because it is
 * posted somewhere the app's theme does not reach. So these are the only colours in the feature that do
 * not come from theme tokens. Flat fills only: no gradient, no blur.
 */
export interface CardLook {
  /** The card's ground. Transparent for Clear, which saves as a transparent PNG. */
  fill: string;
  ink: string;
  /** Units and secondary lines. */
  ink2: string;
  /** The rule between parts, where one is drawn. */
  rule: string;
  /** A soft shadow under the words so white stays readable over any photo (Clear only). */
  textShadow: { color: string; offsetY: number; radius: number } | null;
  /** The check badge in the footer. */
  badge: { fill: string; check: string; border: string | null };
  /** The body figure on the Muscles layout. */
  body: { silhouette: string; muscle: string; secondary: string; primary: string };
}

const GOLD = '#FFD179';
const ON_GOLD = '#2B1D0B';

export const CARD_LOOKS: Record<ShareLook, CardLook> = {
  clear: {
    fill: 'transparent',
    ink: '#FFFFFF',
    ink2: 'rgba(255,255,255,0.86)',
    rule: 'rgba(255,255,255,0.30)',
    textShadow: { color: 'rgba(0,0,0,0.55)', offsetY: 1, radius: 8 },
    badge: { fill: GOLD, check: ON_GOLD, border: null },
    body: {
      silhouette: 'rgba(255,255,255,0.12)',
      muscle: 'rgba(255,255,255,0.26)',
      secondary: '#D19A3A',
      primary: GOLD,
    },
  },
  black: {
    fill: '#161616',
    ink: '#F4F4F4',
    ink2: '#BEBEBE',
    rule: '#353535',
    textShadow: null,
    badge: { fill: GOLD, check: ON_GOLD, border: null },
    body: { silhouette: '#202020', muscle: '#2F2F2F', secondary: '#9A6F20', primary: GOLD },
  },
  parchment: {
    fill: '#F5E4B1',
    ink: ON_GOLD,
    ink2: '#614722',
    rule: '#D7C27E',
    textShadow: null,
    badge: { fill: GOLD, check: ON_GOLD, border: '#6A522E' },
    body: { silhouette: '#E3CE90', muscle: '#EBD9A0', secondary: '#F2C14E', primary: '#7A4A12' },
  },
};

/** What the picture is drawn at: a Story, 9:16. Captured at exactly this size, shown smaller. */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;
/** How much smaller the preview is shown (225 × 400). */
export const PREVIEW_SCALE = 0.625;

/**
 * Behind a Clear picture the preview shows a checkerboard, the usual sign for "transparent". It stands in
 * for whatever photo the picture will sit on, so it is dark in both app themes: white words must read on it.
 */
export const CHECKER = { base: '#2E2E31', square: '#4A4A4E', size: 16 } as const;
