import { buildTheme } from '../buildTheme';
import { softMaterials } from '../materials/soft';
import { BRAND_GOLD, ON_BRAND } from '../tokens/brand';
import { semanticColors } from '../tokens/colors';
import { contrastRatio, luminance } from '../tokens/contrast';

/** Every shadow in a box-shadow list, e.g. "-4px -4px 10px rgba(...), inset 2px 2px 5px #000". */
const shadowsOf = (boxShadow: string) =>
  boxShadow
    .split(/,(?![^(]*\))/)
    .map((part) => part.trim())
    .filter(Boolean);

/** The x and y offsets and blur of one shadow, ignoring the `inset` keyword and the colour. */
const geometry = (shadow: string) => {
  const [x = 0, y = 0, blur = 0] =
    shadow
      .replace(/^inset\s+/, '')
      .match(/-?\d+(\.\d+)?px/g)
      ?.map((value) => Number.parseFloat(value)) ?? [];
  return { x, y, blur };
};

describe.each(['light', 'dark'] as const)('the %s soft material', (scheme) => {
  const material = softMaterials[scheme];
  const colors = semanticColors[scheme];

  it('is what the theme carries, whichever heat palette is chosen', () => {
    expect(buildTheme(scheme, 'amber').material).toBe(material);
  });

  it.each([
    ['raised', material.raised.background],
    ['raised (small)', material.raisedSm.background],
    ['inset', material.inset.background],
  ])('keeps body text readable on a %s surface (WCAG AA, 4.5:1)', (_name, background) => {
    expect(contrastRatio(colors.text, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.text2, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the brand gold on the primary action, with its ink readable', () => {
    expect(material.accent.background).toBe(BRAND_GOLD);
    expect(contrastRatio(ON_BRAND, material.accent.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('reads an inset surface as recessed by its colour alone, not only its shadow', () => {
    // Inset shadows need Android 10+; below that the darker fill is all that marks the recess.
    expect(luminance(material.inset.background)).toBeLessThan(luminance(material.raised.background));
  });

  it.each([
    ['raised', material.raised.shadow],
    ['raised (small)', material.raisedSm.shadow],
    ['accent', material.accent.shadow],
  ])('lifts a %s surface with a highlight on one side and a shade on the other', (_name, shadow) => {
    const parts = shadowsOf(shadow).map(geometry);
    expect(parts).toHaveLength(2);
    const [highlight, shade] = parts;
    // Light falls from the upper left: the highlight is offset up-left, the shade down-right.
    expect(highlight?.x).toBeLessThan(0);
    expect(highlight?.y).toBeLessThan(0);
    expect(shade?.x).toBeGreaterThan(0);
    expect(shade?.y).toBeGreaterThan(0);
    // Real depth has a soft blur; a zero-blur offset is a hard block shadow, not this material.
    for (const part of parts) expect(part.blur).toBeGreaterThan(0);
  });

  it.each([
    ['inset', material.inset.shadow],
    ['pressed', material.pressed.shadow],
  ])('presses a %s surface into the ground with inner shadows only', (_name, shadow) => {
    const parts = shadowsOf(shadow);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(part.startsWith('inset ')).toBe(true);
  });

  it('keeps every shadow small: depth, never a floating bubble', () => {
    const all = [
      material.raised.shadow,
      material.raisedSm.shadow,
      material.inset.shadow,
      material.pressed.shadow,
      material.accent.shadow,
    ].flatMap(shadowsOf);
    for (const shadow of all) {
      const { x, y, blur } = geometry(shadow);
      expect(Math.abs(x)).toBeLessThanOrEqual(6);
      expect(Math.abs(y)).toBeLessThanOrEqual(6);
      expect(blur).toBeLessThanOrEqual(16);
    }
  });
});

describe('the gold primary action', () => {
  it('carries a dark edge on parchment, where gold alone would barely separate from the ground', () => {
    expect(softMaterials.light.accent.edge).toBe(semanticColors.light.accentEdge);
    expect(contrastRatio(BRAND_GOLD, softMaterials.light.raised.background)).toBeLessThan(1.5);
  });

  it('needs no edge on walnut, where the gold stands out on its own', () => {
    expect(softMaterials.dark.accent.edge).toBeNull();
    expect(contrastRatio(BRAND_GOLD, softMaterials.dark.raised.background)).toBeGreaterThan(7);
  });
});
