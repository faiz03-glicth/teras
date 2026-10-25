import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { PrerenderedSurface, styleList } from '../PrerenderedSurface';

describe('PrerenderedSurface', () => {
  it('stays a plain view with the same look, in a cached layer, where there is no native surface', () => {
    const { toJSON } = render(
      <View testID="parent">
        <PrerenderedSurface
          frame={{ position: 'absolute', top: -12 }}
          style={[
            { position: 'absolute', top: 12 },
            [{ backgroundColor: '#FAEDC2', boxShadow: '3px 3px 8px rgba(0,0,0,0.3)' }, false],
            { borderRadius: 20 },
          ]}
        />
      </View>,
    );

    expect(toJSON()).toMatchObject({
      children: [
        {
          type: 'View',
          props: {
            style: { position: 'absolute', top: -12 },
            renderToHardwareTextureAndroid: true,
            collapsable: false,
            pointerEvents: 'none',
            testID: 'cached-surface',
          },
          children: [
            {
              type: 'View',
              props: {
                style: {
                  position: 'absolute',
                  top: 12,
                  backgroundColor: '#FAEDC2',
                  boxShadow: '3px 3px 8px rgba(0,0,0,0.3)',
                  borderRadius: 20,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it('keeps a surface with no shadow (Black: fill and borders) a plain view in no layer at all', () => {
    const { toJSON } = render(
      <View testID="parent">
        <PrerenderedSurface
          frame={{ position: 'absolute', top: -12 }}
          style={[
            { position: 'absolute', top: 12 },
            { backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#2E2E33', borderBottomWidth: 3 },
            { borderRadius: 20 },
          ]}
        />
      </View>,
    );

    expect(toJSON()).toMatchObject({
      children: [
        {
          type: 'View',
          props: { renderToHardwareTextureAndroid: false, collapsable: false, testID: 'cached-surface' },
          children: [
            {
              type: 'View',
              props: {
                style: {
                  position: 'absolute',
                  top: 12,
                  backgroundColor: '#1B1B1E',
                  borderWidth: 1,
                  borderColor: '#2E2E33',
                  borderBottomWidth: 3,
                  borderRadius: 20,
                },
              },
            },
          ],
        },
      ],
    });
  });
});

describe('styleList', () => {
  it('lists every style of a nested style prop in order, leaving out the gaps', () => {
    const a = { top: 1 };
    const b = { left: 2 };
    const c = { right: 3 };

    expect(styleList([a, [null, [b, false]], undefined, c])).toEqual([a, b, c]);
    expect(styleList(a)).toEqual([a]);
    expect(styleList(null)).toEqual([]);
  });
});
