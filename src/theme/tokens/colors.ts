import type { ColorScheme, SemanticColors } from '../types';
import { BRAND_GOLD, ON_BRAND } from './brand';

/**
 * Semantic colours, designed per scheme rather than inverted. Sampled from the Kingdom Rush kit's wood,
 * parchment, gold and iron (docs/design/decisions.md, decision 14).
 * - Parchment (light): buttery paper surfaces with dark wood ink, for bright gyms.
 * - Black (dark): neutral greys on near-black (no blue cast), flat solid surfaces, off-white text. Wells are a step
 *   LIGHTER than the card they sit in. Gold is reserved for meaning (the action, the current item), never
 *   for body text.
 * - Text meets WCAG AA on every surface it sits on (>= 4.5:1); control outlines reach 3:1.
 */
export const semanticColors: Record<ColorScheme, SemanticColors> = {
  light: {
    canvas: '#F6E7B6',
    surface: '#FFF6D6',
    surfaceRaised: '#FFFCF0',
    subtle: '#EFDDA6',
    border: '#D7C27E',
    border2: '#8B7A4A',
    text: '#2B1D0B',
    text2: '#614722',
    text3: '#7A5E3A',
    accent: BRAND_GOLD,
    accentEdge: '#6A522E',
    accentSoft: '#FFE2A0',
    accentText: '#7A4A12',
    onAccent: ON_BRAND,
    success: '#4F7A1E',
    danger: '#984527',
    dangerSoft: '#F6DCCB',
    dangerText: '#984527',
    onDanger: '#FFF4EC',
    scrim: 'rgba(30,18,6,0.42)',
    thumb: '#FFFFFF',
    // The raised card, subtle and border: on parchment the drawing already reads.
    bodyCanvas: '#FAEDC2',
    bodySilhouette: '#EFDDA6',
    bodyMuscle: '#D7C27E',
    // Week map tiers: not hit, once, twice (the mockup's parchment tones).
    muscleNone: '#B5AEA0',
    muscleOnce: '#8A847A',
    muscleTwice: '#3F3A34',
  },
  dark: {
    canvas: '#0B0B0B',
    surface: '#1B1B1B',
    // Black has no soft shadow to lift chrome with: the tab bar and the card share one graphite.
    surfaceRaised: '#1B1B1B',
    subtle: '#222222',
    border: '#353535',
    border2: '#6E6E6E',
    text: '#F4F4F4',
    text2: '#BEBEBE',
    text3: '#A1A1A1',
    accent: BRAND_GOLD,
    accentEdge: '#9A6F20',
    // The selected tab and chips sit on a neutral grey; the gold is in the label, not the ground.
    accentSoft: '#272727',
    accentText: '#FFD179',
    onAccent: ON_BRAND,
    // Saved and synced are grey: Black rations its gold to the action and the current item.
    success: '#B0B0B0',
    // Discard, Delete and Undo are a solid red with white on it. The red is a fill only: words and icons that
    // warn on a card or the page are the plain text colour (red text on graphite fell short of AA).
    danger: '#D63A40',
    dangerSoft: '#200E10',
    dangerText: '#F4F4F4',
    onDanger: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.55)',
    thumb: '#FFFFFF',
    // The card is the raised graphite; the figure and its muscles are soft greys on it.
    bodyCanvas: '#1B1B1B',
    bodySilhouette: '#2C2C2C',
    bodyMuscle: '#7B7B7B',
    // Week map tiers: not hit, once, twice (soft greys; the brightest is no longer near-white).
    muscleNone: '#3B3B3B',
    muscleOnce: '#7B7B7B',
    muscleTwice: '#B9B9B9',
  },
};
