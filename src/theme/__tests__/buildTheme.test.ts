import { buildTheme } from '../buildTheme';
import { HEAT_PALETTE_IDS } from '../tokens/heatPalettes';
import type { ColorScheme, Theme } from '../types';

const SCHEMES: ColorScheme[] = ['light', 'dark'];
const COMBOS = SCHEMES.flatMap((scheme) => HEAT_PALETTE_IDS.map((palette) => [scheme, palette] as const));

const COLOR = /^(#[0-9A-F]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i;

function collectStrings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, `${path}.${key}`));
  }
  return [];
}

describe('buildTheme', () => {
  it('covers all 8 scheme × palette combinations', () => {
    expect(COMBOS).toHaveLength(8);
  });

  it.each(COMBOS)('%s / %s produces a complete theme', (scheme, palette) => {
    const theme: Theme = buildTheme(scheme, palette);

    expect(theme.scheme).toBe(scheme);
    expect(theme.paletteId).toBe(palette);
    expect(theme.material.ground).toBe(theme.colors.canvas);
    expect(theme.heat).toHaveLength(5);
    expect(Object.keys(theme.activity).sort()).toEqual(['blue', 'green', 'orange', 'pink', 'purple', 'teal']);

    const colors = collectStrings({
      colors: theme.colors,
      activity: theme.activity,
      heat: theme.heat,
      brand: theme.brand,
    });
    for (const [path, color] of colors) {
      expect({ path, valid: COLOR.test(color) }).toEqual({ path, valid: true });
    }
  });

  it('matches the approved design tokens', () => {
    const light = buildTheme('light', 'amber');
    const dark = buildTheme('dark', 'amber');

    // Parchment and Walnut.
    expect(light.colors.canvas).toBe('#F6E7B6');
    expect(dark.colors.canvas).toBe('#16110C');
    // The brand gold and its ink, identical in both schemes.
    expect(light.colors.accent).toBe('#FFD179');
    expect(dark.colors.accent).toBe('#FFD179');
    expect(dark.colors.onAccent).toBe('#2B1D0B');
    expect(light.heat).toEqual(['#EBDBA6', '#FBE3A0', '#F2C14E', '#C98A1E', '#7A4A12']);
    expect(dark.heat).toEqual(['#2A2119', '#4A3719', '#8A6420', '#D19A3A', '#FFD179']);
  });

  it('is pure: identical inputs give equal themes', () => {
    expect(buildTheme('dark', 'ocean')).toEqual(buildTheme('dark', 'ocean'));
  });
});
