import { softMaterials } from './materials/soft';
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
import type { ColorScheme, HeatPaletteId, HeatSteps, Theme } from './types';

/** PURE: composes tokens into a complete theme. No side effects. */
export function buildTheme(scheme: ColorScheme, paletteId: HeatPaletteId): Theme {
  const colors = semanticColors[scheme];
  const heat = heatPalettes[paletteId][scheme];
  const ink = (step: string) => mostLegible(step, [colors.text, '#FFFFFF', ON_BRAND]);
  const heatInk: HeatSteps = [ink(heat[0]), ink(heat[1]), ink(heat[2]), ink(heat[3]), ink(heat[4])];

  return {
    scheme,
    paletteId,
    colors,
    activity: activityColors[scheme],
    heat,
    heatInk,
    brand: brandColors[scheme],
    elevation: elevation[scheme],
    material: softMaterials[scheme],
    typography,
    fonts,
    spacing,
    radii,
  };
}
