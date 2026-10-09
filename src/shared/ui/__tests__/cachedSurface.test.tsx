import { screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { Card } from '../Card';
import { StatTile } from '../StatTile';
import { Text } from '../Text';

/**
 * On Android a box shadow is blurred again on every frame its view moves (a scroll, a screen sliding), so a
 * screen of raised cards re-blurs two shadows per card per frame. A surface's look (fill and shadows) is
 * drawn on its own, behind the content, once into a texture that is reused; the content above stays live.
 */
function lookOf(surface: ReactTestInstance) {
  expect(surface.props.renderToHardwareTextureAndroid).toBe(true);
  expect(surface.props.collapsable).toBe(false);
  expect(surface.props.pointerEvents).toBe('none');
  return styleOf(surface.props.children);
}

describe.each(SCHEMES)('cached surfaces in %s', (scheme) => {
  it("draws a card's fill and shadows once, behind its rows, not on the card itself", () => {
    const { theme } = renderInScheme(
      <Card testID="card">
        <Text>Row</Text>
      </Card>,
      scheme,
    );

    expect(styleOf(screen.getByTestId('card')).boxShadow).toBeUndefined();
    expect(styleOf(screen.getByTestId('card')).backgroundColor).toBeUndefined();
    expect(lookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      backgroundColor: theme.material.raised.background,
      boxShadow: theme.material.raised.shadow,
      borderRadius: theme.radii.card,
    });
  });

  it('caches the gold-tinted card, the well pressed into the material, the same way', () => {
    const { theme } = renderInScheme(
      <Card tone="accentSoft">
        <Text>Rest</Text>
      </Card>,
      scheme,
    );

    expect(lookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      backgroundColor: theme.colors.accentSoft,
      boxShadow: theme.material.inset.shadow,
    });
  });

  it("caches a stat tile's raised look", () => {
    const { theme } = renderInScheme(<StatTile label="Active days" value={12} testID="tile" />, scheme);

    expect(styleOf(screen.getByTestId('tile')).boxShadow).toBeUndefined();
    expect(lookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      backgroundColor: theme.material.raised.background,
      boxShadow: theme.material.raised.shadow,
    });
  });
});
