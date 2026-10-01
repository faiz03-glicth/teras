import type { ColorScheme, SemanticColors } from '../types';
import { BRAND_GOLD, ON_BRAND } from './brand';

/**
 * Semantic colours, designed per scheme rather than inverted. Sampled from the Kingdom Rush kit's wood,
 * parchment, gold and iron (docs/design/decisions.md, decision 14).
 * - Parchment (light): buttery paper surfaces with dark wood ink, for bright gyms.
 * - Walnut (dark): flat dark wood, solid planks one step lighter, warm off-white text. Gold is reserved
 *   for meaning (the action, the current item), never for body text.
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
    scrim: 'rgba(30,18,6,0.42)',
    thumb: '#FFFFFF',
  },
  dark: {
    canvas: '#16110C',
    surface: '#241C15',
    surfaceRaised: '#30261D',
    subtle: '#1E1812',
    border: '#332920',
    border2: '#7E6D5A',
    text: '#F2E8D5',
    text2: '#C4B39A',
    text3: '#A39279',
    accent: BRAND_GOLD,
    accentEdge: '#8C5E14',
    accentSoft: '#3A2E1A',
    accentText: '#FFD179',
    onAccent: ON_BRAND,
    danger: '#E88A63',
    dangerSoft: '#3D251B',
    scrim: 'rgba(0,0,0,0.55)',
    thumb: '#FFFFFF',
  },
};
