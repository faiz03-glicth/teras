import path from 'path';
import { processColor, type BoxShadowValue } from 'react-native';

import { softMaterials } from '@/theme/materials/soft';

import { fromBoxShadowValues, parseBoxShadow, toPrerenderedLook } from '../prerenderedLook';

interface ReactNativeShadow {
  offsetX: number;
  offsetY: number;
  blurRadius?: number;
  spreadDistance?: number;
  color?: number;
  inset?: boolean;
}

/** React Native's own reading of a box-shadow (untyped), which the native PrerenderedSurface must match. */
const processBoxShadow: (value: string | readonly BoxShadowValue[]) => ReactNativeShadow[] =
  require('react-native/Libraries/StyleSheet/processBoxShadow').default;

/**
 * Unistyles' own parser (jest mocks the package, so it is loaded by path): on a device, Unistyles turns a
 * style's box-shadow string into these objects before any component sees the style.
 */
const unistylesRoot = path.dirname(require.resolve('react-native-unistyles/package.json'));
const unistylesParse: (value: string) => BoxShadowValue[] = require(
  path.join(unistylesRoot, 'lib/commonjs/core/parseBoxShadow'),
).parseBoxShadowString;

/** Every shadow string the material carries, in both schemes. */
const materialShadows = Object.values(softMaterials).flatMap((material) => [
  material.raised.shadow,
  material.raisedSm.shadow,
  material.inset.shadow,
  material.pressed.shadow,
  material.bar.shadow,
  material.accent.shadow,
  material.accent.pressedShadow,
]);

/** React Native's result in this file's terms: its omitted fields filled with what Android draws. */
function asReactNativeReadsIt(value: string | readonly BoxShadowValue[]) {
  return processBoxShadow(value).map((shadow) => ({
    offsetX: shadow.offsetX,
    offsetY: shadow.offsetY,
    blur: shadow.blurRadius ?? 0,
    spread: shadow.spreadDistance ?? 0,
    color: shadow.color ?? processColor('black'),
    inset: shadow.inset ?? false,
  }));
}

describe('parseBoxShadow', () => {
  it.each(materialShadows)('reads the material shadow %s exactly as React Native does', (value) => {
    const parsed = parseBoxShadow(value);

    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed).toEqual(asReactNativeReadsIt(value));
  });

  it('reads offsets, blur, spread, colour and inset', () => {
    expect(parseBoxShadow('inset -3px 4px 6px 2px rgba(0,0,0,0.5)')).toEqual([
      { offsetX: -3, offsetY: 4, blur: 6, spread: 2, color: processColor('rgba(0,0,0,0.5)'), inset: true },
    ]);
  });

  it('leaves blur and spread at zero and the colour black when they are not given', () => {
    expect(parseBoxShadow('2px 3px')).toEqual([
      { offsetX: 2, offsetY: 3, blur: 0, spread: 0, color: processColor('black'), inset: false },
    ]);
  });

  it.each([
    ['nothing', ''],
    ['a unitless length', '2 3px 4px black'],
    ['a negative blur', '2px 3px -4px black'],
    ['a length after the colour', '2px black 3px'],
    ['two colours', '2px 3px red blue'],
    ['five lengths', '1px 2px 3px 4px 5px'],
    ['one length', '2px black'],
  ])('draws no shadow for %s, as React Native', (_case, value) => {
    expect(parseBoxShadow(value)).toEqual([]);
    expect(asReactNativeReadsIt(value)).toEqual([]);
  });

  it('voids the whole list when one shadow in it is malformed, as React Native', () => {
    expect(parseBoxShadow('2px 2px black, 2 2px black')).toEqual([]);
  });
});

describe('fromBoxShadowValues', () => {
  it.each(materialShadows)(
    'reads the material shadow %s as Unistyles hands it over, as React Native does',
    (value) => {
      const objects = unistylesParse(value);

      expect(fromBoxShadowValues(objects)).toEqual(parseBoxShadow(value));
      expect(fromBoxShadowValues(objects)).toEqual(asReactNativeReadsIt(objects));
    },
  );

  it('takes lengths as numbers or px strings and the colour black when none is given', () => {
    expect(fromBoxShadowValues([{ offsetX: '2px', offsetY: 3, blurRadius: '4px', inset: true }])).toEqual([
      { offsetX: 2, offsetY: 3, blur: 4, spread: 0, color: processColor('black'), inset: true },
    ]);
  });

  it.each([
    ['a unitless length', [{ offsetX: '2', offsetY: 0 }]],
    ['a negative blur', [{ offsetX: 0, offsetY: 0, blurRadius: -1 }]],
    ['a colour that is none', [{ offsetX: 0, offsetY: 0, color: 'notacolour' }]],
  ] as const)('draws no shadow for %s, as React Native', (_case, values) => {
    expect(fromBoxShadowValues(values)).toEqual([]);
    expect(asReactNativeReadsIt(values)).toEqual([]);
  });
});

describe('toPrerenderedLook', () => {
  it("hands over a card's fill, corners and shadows and keeps the rest for the view's layout", () => {
    const look = toPrerenderedLook({
      position: 'absolute',
      top: 24,
      backgroundColor: '#FAEDC2',
      borderRadius: 20,
      boxShadow: softMaterials.light.raised.shadow,
    });

    expect(look).toEqual({
      fill: processColor('#FAEDC2'),
      radius: 20,
      shadows: parseBoxShadow(softMaterials.light.raised.shadow),
      style: { position: 'absolute', top: 24 },
    });
  });

  it('draws no fill and no shadow where none is given', () => {
    expect(toPrerenderedLook({ borderRadius: 8 })).toEqual({ fill: 0, radius: 8, shadows: [], style: {} });
  });

  it.each([
    ['an edge', { borderWidth: 1, borderColor: '#000' }],
    ['one edge', { borderTopWidth: 2 }],
    ['corners of their own', { borderTopLeftRadius: 4 }],
    ['a radius in percent', { borderRadius: '50%' }],
  ] as const)('leaves a surface with %s to React Native', (_case, extra) => {
    expect(toPrerenderedLook({ backgroundColor: '#FFF', boxShadow: '1px 1px black', ...extra })).toBeNull();
  });

  it('takes the shadows as objects too, the form Unistyles hands over', () => {
    const shadow = softMaterials.dark.raised.shadow;

    expect(toPrerenderedLook({ borderRadius: 20, boxShadow: unistylesParse(shadow) })?.shadows).toEqual(
      parseBoxShadow(shadow),
    );
  });

  it('prerenders a surface whose edge is zero wide (the gold key on walnut)', () => {
    expect(toPrerenderedLook({ borderWidth: 0, borderColor: 'transparent' })).not.toBeNull();
  });
});
