import { glassMaterials } from './materials/glass';
import { activityColors } from './tokens/activityColors';
import { ON_BRAND } from './tokens/brand';
import { brandColors } from './tokens/brandColors';
import { semanticColors } from './tokens/colors';
import { elevation } from './tokens/elevation';
import { mostLegible } from './tokens/contrast';
import { heatPalettes } from './tokens/heatPalettes';
import { radii } from './tokens/radii';
import { spacing } from './tokens/spacing';
import { fonts, typography } from './tokens/typography';
import type { ColorScheme, HeatPaletteId, HeatSteps, Theme, VisualStyle } from './types';

/** PURE: composes tokens into a complete theme. No side effects. */
export function buildTheme(scheme: ColorScheme, paletteId: HeatPaletteId, style: VisualStyle): Theme {
  const glass = style === 'glass' ? glassMaterials[scheme] : null;
  const baseColors = semanticColors[scheme];
  const baseHeat = heatPalettes[paletteId][scheme];
  const heat: HeatSteps = glass
    ? [glass.heatEmpty, baseHeat[1], baseHeat[2], baseHeat[3], baseHeat[4]]
    : baseHeat;

  const colors = glass ? { ...baseColors, canvas: glass.canvasBase, subtle: glass.tint } : baseColors;
  const ink = (step: string) => mostLegible(step, [colors.text, '#FFFFFF', ON_BRAND]);
  const heatInk: HeatSteps = [ink(heat[0]), ink(heat[1]), ink(heat[2]), ink(heat[3]), ink(heat[4])];

  return {
    scheme,
    style,
    paletteId,
    colors,
    activity: activityColors[scheme],
    heat,
    heatInk,
    brand: brandColors[scheme],
    elevation: elevation[scheme],
    glass,
    typography,
    fonts,
    spacing,
    radii,
  };
}
