import type { ColorScheme, SemanticColors } from '../types';
import { BRAND_GOLD, ON_BRAND } from './brand';

/**
 * Semantic colours, designed per scheme rather than inverted. Sampled from the Kingdom Rush kit's wood,
 * parchment, gold and iron (docs/design/decisions.md, decision 14).
 * - Parchment (light): buttery paper surfaces with dark wood ink, for bright gyms.
 * - Walnut (dark, "A, lifted"): a mid-dark wood ground, light enough for the material's highlight and shade
 *   both to show; cards and keys one flat step lighter; warm off-white text. Gold is reserved for meaning
 *   (the action, the current item), never for body text.
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
    danger: '#984527',
    dangerSoft: '#F6DCCB',
    onDanger: '#FFF4EC',
    success: '#4F7A1E',
    scrim: 'rgba(30,18,6,0.42)',
    thumb: '#FFFFFF',
    // The raised card, subtle and border: on parchment the drawing already reads.
    bodyCanvas: '#FAEDC2',
    bodySilhouette: '#EFDDA6',
    bodyMuscle: '#D7C27E',
    muscleNone: '#B5AEA0',
    muscleOnce: '#8A847A',
    muscleTwice: '#3F3A34',
  },
  dark: {
    canvas: '#2A2119',
    surface: '#2F261D',
    // The tab bar is the raised walnut itself: its shadow lifts it, so it needs no lighter tone.
    surfaceRaised: '#2F261D',
    // A step below the ground, like parchment's: tracks and quiet fills read as pressed in.
    subtle: '#251D16',
    border: '#3E3228',
    border2: '#857360',
    text: '#F4EAD8',
    text2: '#CDBDA4',
    text3: '#AE9D84',
    accent: BRAND_GOLD,
    accentEdge: '#8C5E14',
    accentSoft: '#4A3A20',
    accentText: '#FFD179',
    onAccent: ON_BRAND,
    danger: '#EC9068',
    dangerSoft: '#45291E',
    onDanger: '#2A140A',
    success: '#7FD08A',
    scrim: 'rgba(0,0,0,0.55)',
    thumb: '#FFFFFF',
    // A lighter walnut card, so the figure and its muscles read: muscles 4.4:1 on it, the body 1.5:1.
    bodyCanvas: '#3A2E24',
    bodySilhouette: '#57483A',
    bodyMuscle: '#A9927A',
    muscleNone: '#4E4740',
    muscleOnce: '#DAD6D0',
    muscleTwice: '#8F8A83',
  },
};
