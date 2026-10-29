import { buildTheme } from '../buildTheme';
import { softMaterials } from '../materials/soft';
import { accentStyle, depthStyle, edgeRoom, faceLift, shadowStyle, surfaceStyle } from '../surfaceStyle';
import { BRAND_GOLD, ON_BRAND } from '../tokens/brand';
import { semanticColors } from '../tokens/colors';
import { contrastRatio, luminance } from '../tokens/contrast';
import type { ColorScheme, EdgeStyle, PressLook } from '../types';

/** Every shadow in a box-shadow list, e.g. "-4px -4px 10px rgba(...), inset 2px 2px 5px #000". */
const shadowsOf = (boxShadow: string | undefined) =>
  (boxShadow ?? '')
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

/** Every surface of a scheme's material, by name: the places a shadow or an edge can be. */
const looksOf = (scheme: ColorScheme): Record<string, PressLook> => {
  const material = softMaterials[scheme];
  return {
    raised: material.raised,
    'raised (small)': material.raisedSm,
    inset: material.inset,
    pressed: material.pressed,
    bar: material.bar,
    accent: material.accent,
    'accent (pressed)': material.accent.pressed,
    'cta (wide)': material.cta.wide,
    'cta (wide, pressed)': material.cta.wide.pressed,
    'cta (narrow)': material.cta.narrow,
    'cta (narrow, pressed)': material.cta.narrow.pressed,
  };
};

const allShadows = (scheme: ColorScheme) =>
  Object.values(looksOf(scheme)).flatMap((look) => shadowsOf(look.shadow));

/** The width an edge style gives one side: its own, or the all-round width. */
const side = (edges: EdgeStyle | undefined, which: 'Top' | 'Bottom') =>
  edges?.[`border${which}Width`] ?? edges?.borderWidth ?? 0;

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

  it('keeps every shadow small: depth, never a floating bubble', () => {
    for (const shadow of allShadows(scheme)) {
      const { x, y, blur } = geometry(shadow);
      expect(Math.abs(x)).toBeLessThanOrEqual(6);
      expect(Math.abs(y)).toBeLessThanOrEqual(6);
      expect(blur).toBeLessThanOrEqual(16);
    }
  });

  it('gives every surface depth one way or the other, a shadow or edges, so none is left flat', () => {
    for (const [name, look] of Object.entries(looksOf(scheme))) {
      expect({ name, drawn: Boolean(look.shadow) || Boolean(look.edges) }).toEqual({ name, drawn: true });
    }
  });
});

describe('the Parchment material', () => {
  const material = softMaterials.light;

  it('draws its depth with soft shadows and no edges', () => {
    for (const [name, look] of Object.entries(looksOf('light'))) {
      expect({ name, edges: look.edges }).toEqual({ name, edges: undefined });
    }
  });

  it.each([
    ['inset', material.inset.shadow],
    ['pressed', material.pressed.shadow],
    ['accent (pressed)', material.accent.pressed.shadow],
  ])('presses a %s surface into the ground with inner shadows only', (_name, shadow) => {
    const parts = shadowsOf(shadow);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) expect(part.startsWith('inset ')).toBe(true);
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
    // Soft depth has a real blur; a zero-blur offset is a hard block shadow, which is Black's look.
    for (const part of parts) expect(part.blur).toBeGreaterThan(0);
  });

  it('is styled as a fill and a shadow, exactly as before the edges existed', () => {
    expect(surfaceStyle(material.raised)).toEqual({
      backgroundColor: material.raised.background,
      boxShadow: material.raised.shadow,
    });
    expect(depthStyle(material.pressed)).toEqual({ boxShadow: material.pressed.shadow });
    expect(faceLift(material.raised)).toBe(0);
  });
});

describe('the Black material', () => {
  const material = softMaterials.dark;

  it.each(Object.keys(looksOf('dark')))('draws no box-shadow on its %s surface', (name) => {
    // Android draws every boxShadow, outset or inset, even with no blur, as an extra pass per view.
    const look = looksOf('dark')[name];
    expect(look?.shadow ?? '').toBe('');
    expect(shadowsOf(look?.shadow)).toHaveLength(0);
    expect(surfaceStyle({ background: '#000', ...look })).not.toHaveProperty('boxShadow');
  });

  it('carries no non-empty shadow anywhere in the material, not even the gold key under a finger', () => {
    expect(allShadows('dark')).toEqual([]);
    expect(JSON.stringify(material)).not.toMatch(/shadow/i);
  });

  it('sets an empty heatmap day apart as a lighter, outlined well, with no blur', () => {
    expect(luminance(material.carved.background)).toBeGreaterThan(luminance(material.raised.background));
    expect(material.carved).toMatchObject({ shade: '#353535', light: '#353535', edge: 1 });
  });

  it.each([
    ['raised', material.raised, 3],
    ['raised (small)', material.raisedSm, 2],
    ['accent', material.accent, 3],
  ])('stands a %s surface on a hard ledge of native border below it', (name, look, ledge) => {
    expect(side(look.edges, 'Bottom')).toBe(ledge);
    expect(look.edges?.borderBottomColor).toBe(
      name === 'accent' ? semanticColors.dark.accentEdge : '#050505',
    );
    // Level with the sides and top the ledge is thicker than the 1px rim.
    expect(side(look.edges, 'Top')).toBe(1);
    expect(look.edges?.borderWidth).toBe(1);
  });

  it('rims the raised surfaces with a 1px border line', () => {
    expect(material.raised.edges).toMatchObject({ borderWidth: 1, borderColor: '#2F2F2F' });
    expect(material.raisedSm.edges).toMatchObject({ borderWidth: 1, borderColor: '#2F2F2F' });
  });

  it('makes a well a flat step LIGHTER than the card, with a hard lip along its top', () => {
    expect(material.raised.background).toBe(semanticColors.dark.surface);
    // The mockup's well (#272727) is a step above the flat `subtle` grey (#222222), so it reads as cut in.
    expect(material.inset.background).toBe('#272727');
    expect(luminance(material.inset.background)).toBeGreaterThan(luminance(material.raised.background));
    expect(material.inset.edges).toEqual({
      borderWidth: 1,
      borderColor: '#353535',
      borderTopWidth: 2,
      borderTopColor: '#141414',
    });
  });

  it('presses a held surface in: no ledge, a deep shade 3 thick under its top edge', () => {
    expect(material.pressed.edges).toMatchObject({
      borderBottomWidth: 1,
      borderBottomColor: '#2B2B2B',
      borderTopWidth: 3,
      borderTopColor: 'rgba(0,0,0,0.75)',
    });
    expect(material.accent.pressed.edges).toMatchObject({
      borderBottomWidth: 1,
      borderTopWidth: 2,
      borderTopColor: 'rgba(122,74,18,0.55)',
    });
    for (const look of [material.pressed, material.accent.pressed]) {
      expect(side(look.edges, 'Bottom')).toBeLessThan(side(material.raised.edges, 'Bottom'));
    }
  });

  it('sinks a held small key a little, where Parchment does not move it', () => {
    expect(material.keySink).toBe(2);
    expect(softMaterials.light.keySink).toBe(0);
  });

  it('keeps the tab bar flat graphite, parted from the page by a one-pixel top border', () => {
    expect(material.bar).toEqual({
      background: '#141414',
      edges: { borderTopWidth: 1, borderTopColor: '#2F2F2F' },
    });
  });

  it('is styled as a fill and edges, with no boxShadow key at all', () => {
    expect(surfaceStyle(material.raised)).toEqual({
      backgroundColor: '#1B1B1B',
      borderWidth: 1,
      borderColor: '#2F2F2F',
      borderBottomWidth: 3,
      borderBottomColor: '#050505',
    });
    expect(shadowStyle(material.raised)).toEqual({});
  });

  it('puts the ledge inside the box, so a key centres its content on the face above it', () => {
    expect(edgeRoom(material.raised)).toEqual({ top: 1, right: 1, bottom: 3, left: 1 });
    expect(faceLift(material.raised)).toBe(2);
    expect(faceLift(material.raisedSm)).toBe(1);
    // A well's lip is on top, so nothing lifts.
    expect(faceLift(material.inset)).toBe(0);
  });
});

describe('the gold primary action', () => {
  it('carries a dark edge on parchment, where gold alone would barely separate from the ground', () => {
    expect(softMaterials.light.accent.edge).toBe(semanticColors.light.accentEdge);
    expect(contrastRatio(BRAND_GOLD, softMaterials.light.raised.background)).toBeLessThan(1.5);
    expect(accentStyle(softMaterials.light.accent, 1.5)).toMatchObject({
      borderWidth: 1.5,
      borderColor: semanticColors.light.accentEdge,
      boxShadow: softMaterials.light.accent.shadow,
    });
  });

  it('stands on a base of the same darker gold in Black, where the gold stands out on its own', () => {
    const { edges, edge } = softMaterials.dark.accent;
    expect(edge).toBe(semanticColors.dark.accentEdge);
    expect(edges).toEqual({
      borderWidth: 1,
      borderColor: semanticColors.dark.accentEdge,
      borderBottomWidth: 3,
      borderBottomColor: semanticColors.dark.accentEdge,
    });
    expect(contrastRatio(BRAND_GOLD, softMaterials.dark.raised.background)).toBeGreaterThan(7);
    // Its edges draw the outline, so the Parchment outline is not added over them.
    expect(accentStyle(softMaterials.dark.accent, 1.5)).toMatchObject({ borderWidth: 1 });
  });
});

describe('the big gold keys', () => {
  const { wide, narrow } = softMaterials.dark.cta;

  it.each([
    ['wide', wide, 6],
    ['narrow', narrow, 4],
  ])('stand a %s key on a thick ledge of darker gold, under a bright top edge', (_name, look, ledge) => {
    expect(look.background).toBe(BRAND_GOLD);
    expect(look.edges).toEqual({
      borderWidth: 1,
      borderColor: BRAND_GOLD,
      borderTopColor: '#FFEAB0',
      borderBottomWidth: ledge,
      borderBottomColor: '#6E4312',
    });
    // The bright top edge is lighter than the gold, the ledge darker.
    expect(luminance('#FFEAB0')).toBeGreaterThan(luminance(BRAND_GOLD));
    expect(luminance('#6E4312')).toBeLessThan(luminance(BRAND_GOLD));
  });

  it.each([
    ['wide', wide],
    ['narrow', narrow],
  ])('sinks a held %s key: no ledge, a deeper brown shade under the top edge', (_name, look) => {
    expect(look.pressed.edges).toMatchObject({
      borderWidth: 1,
      borderColor: '#6E4312',
      borderTopWidth: 3,
      borderTopColor: 'rgba(60,35,5,0.65)',
      borderBottomWidth: 1,
    });
    expect(side(look.pressed.edges, 'Bottom')).toBeLessThan(side(look.edges, 'Bottom'));
  });

  it('dresses the face with a darker underside and a drop that shrinks with the ledge', () => {
    expect(wide.face).toEqual({
      underside: { color: 'rgba(122,74,18,0.45)', height: 2 },
      drop: { height: 20, opacity: 1 },
    });
    expect(narrow.face?.drop.height).toBeLessThan(wide.face?.drop.height ?? 0);
  });

  it('is the plain accent in Parchment, which stays as it is', () => {
    const { light } = softMaterials;
    expect(light.cta).toEqual({ wide: light.accent, narrow: light.accent });
    expect(light.cta.wide.face).toBeUndefined();
  });

  it('is made of borders and flat colours: no box-shadow, no inset, no gradient in any style it adds', () => {
    for (const look of [wide, narrow, wide.pressed, narrow.pressed, softMaterials.dark.pressed]) {
      const style = { ...surfaceStyle({ background: BRAND_GOLD, ...look }), ...depthStyle(look) };
      expect(JSON.stringify(style)).not.toMatch(/shadow|inset|gradient/i);
    }
    expect(JSON.stringify(softMaterials.dark.cta)).not.toMatch(/shadow|inset|gradient|blur/i);
  });
});
