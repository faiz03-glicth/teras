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

    // Parchment and Black.
    expect(light.colors.canvas).toBe('#F6E7B6');
    expect(dark.colors.canvas).toBe('#0B0B0B');
    expect(dark.colors).toMatchObject({
      surface: '#1B1B1B',
      surfaceRaised: '#1B1B1B',
      subtle: '#222222',
      border: '#353535',
      border2: '#6E6E6E',
      text: '#F4F4F4',
      text2: '#BEBEBE',
      text3: '#A1A1A1',
      accentEdge: '#9A6F20',
      accentSoft: '#272727',
      danger: '#E5484D',
      dangerSoft: '#200E10',
      onDanger: '#FFFFFF',
      bodyCanvas: '#1B1B1B',
      bodySilhouette: '#2C2C2C',
      bodyMuscle: '#7B7B7B',
      muscleNone: '#3B3B3B',
      muscleOnce: '#7B7B7B',
      muscleTwice: '#B9B9B9',
    });
    // The brand gold and its ink, identical in both schemes.
    expect(light.colors.accent).toBe('#FFD179');
    expect(dark.colors.accent).toBe('#FFD179');
    expect(dark.colors.onAccent).toBe('#2B1D0B');
    expect(light.heat).toEqual(['#EBDBA6', '#FBE3A0', '#F2C14E', '#C98A1E', '#7A4A12']);
    expect(dark.heat).toEqual(['#2A2119', '#4A3719', '#8A6420', '#D19A3A', '#FFD179']);
  });

  it('gives every scheme a success mark and a tier for each muscle count', () => {
    expect(buildTheme('light', 'amber').colors.success).toBe('#4F7A1E');
    expect(buildTheme('dark', 'amber').colors.success).toBe('#B0B0B0');
    for (const scheme of SCHEMES) {
      const { colors } = buildTheme(scheme, 'amber');
      expect(new Set([colors.muscleNone, colors.muscleOnce, colors.muscleTwice]).size).toBe(3);
    }
  });

  it('is pure: identical inputs give equal themes', () => {
    expect(buildTheme('dark', 'ocean')).toEqual(buildTheme('dark', 'ocean'));
  });
});
