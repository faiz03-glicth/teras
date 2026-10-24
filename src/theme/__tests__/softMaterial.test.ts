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

const LENGTH = /^-?\d+(\.\d+)?(px)?$/;

/** The x and y offsets and blur of one shadow, ignoring the `inset` keyword and the colour. */
const geometry = (shadow: string) => {
  const [x = 0, y = 0, blur = 0] = shadow
    .replace(/^inset\s+/, '')
    .split(/\s+(?![^(]*\))/)
    .filter((token) => LENGTH.test(token))
    .map((token) => Number.parseFloat(token));
  return { x, y, blur };
};

const allShadows = (scheme: 'light' | 'dark') => {
  const material = softMaterials[scheme];
  return [
    material.raised.shadow,
    material.raisedSm.shadow,
    material.inset.shadow,
    material.pressed.shadow,
    material.bar.shadow,
    material.accent.shadow,
    material.accent.pressedShadow,
  ].flatMap(shadowsOf);
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

  it.each([
    ['inset', material.inset.shadow],
    ['pressed', material.pressed.shadow],
    ['accent (pressed)', material.accent.pressedShadow],
  ])('presses a %s surface into the ground with inner shadows only', (_name, shadow) => {
    const parts = shadowsOf(shadow);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(part.startsWith('inset ')).toBe(true);
  });

  it('keeps every shadow small: depth, never a floating bubble', () => {
    for (const shadow of allShadows(scheme)) {
      const { x, y, blur } = geometry(shadow);
      expect(Math.abs(x)).toBeLessThanOrEqual(6);
      expect(Math.abs(y)).toBeLessThanOrEqual(6);
      expect(blur).toBeLessThanOrEqual(16);
    }
  });
});

describe('the Parchment material', () => {
  const material = softMaterials.light;

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
    // Soft depth has a real blur; a zero-blur offset is a hard block shadow, which is Black's look.
    for (const part of parts) expect(part.blur).toBeGreaterThan(0);
  });
});

describe('the Black material', () => {
  const material = softMaterials.dark;

  it('is flat: no shadow in it has a blur', () => {
    // Android draws a blurred boxShadow offscreen on every frame; a hard one is cheaper and is the look.
    for (const shadow of allShadows('dark')) expect(geometry(shadow).blur).toBe(0);
  });

  it('sets an empty heatmap day apart as a lighter, outlined well, with no blur', () => {
    expect(luminance(material.carved.background)).toBeGreaterThan(luminance(material.raised.background));
    expect(material.carved).toMatchObject({ shade: '#34343A', light: '#34343A', edge: 1 });
  });

  it.each([
    ['raised', material.raised.shadow, 3],
    ['raised (small)', material.raisedSm.shadow, 2],
    ['accent', material.accent.shadow, 3],
  ])('stands a %s surface on a hard ledge straight below it', (_name, shadow, ledge) => {
    const outer = shadowsOf(shadow).filter((part) => !part.startsWith('inset '));
    expect(outer).toHaveLength(1);
    expect(geometry(outer[0] ?? '')).toEqual({ x: 0, y: ledge, blur: 0 });
  });

  it('rims the raised surfaces with a 1px inner line', () => {
    expect(shadowsOf(material.raised.shadow)).toContain('inset 0 0 0 1px #2E2E33');
    expect(shadowsOf(material.raisedSm.shadow)).toContain('inset 0 0 0 1px #2E2E33');
  });

  it('makes a well a flat step LIGHTER than the card, with a hard lip along its top', () => {
    expect(material.raised.background).toBe(semanticColors.dark.surface);
    expect(material.inset.background).toBe(semanticColors.dark.subtle);
    expect(luminance(material.inset.background)).toBeGreaterThan(luminance(material.raised.background));
    expect(shadowsOf(material.inset.shadow)).toContain('inset 0 2px 0 rgba(0,0,0,0.45)');
  });

  it('keeps the tab bar flat graphite, parted from the page by a one-pixel line', () => {
    expect(material.bar).toEqual({ background: '#141416', shadow: 'inset 0px 1px 0px #2E2E33' });
  });
});

describe('the gold primary action', () => {
  it('carries a dark edge on parchment, where gold alone would barely separate from the ground', () => {
    expect(softMaterials.light.accent.edge).toBe(semanticColors.light.accentEdge);
    expect(contrastRatio(BRAND_GOLD, softMaterials.light.raised.background)).toBeLessThan(1.5);
  });

  it('stands on a base of the same darker gold in Black, where the gold stands out on its own', () => {
    expect(softMaterials.dark.accent.edge).toBe(semanticColors.dark.accentEdge);
    expect(softMaterials.dark.accent.shadow).toBe(`0 3px 0 ${semanticColors.dark.accentEdge}`);
    expect(contrastRatio(BRAND_GOLD, softMaterials.dark.raised.background)).toBeGreaterThan(7);
  });
});
