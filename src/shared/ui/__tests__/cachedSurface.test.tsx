import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { Button } from '../Button';
import { Card } from '../Card';
import { SegmentedControl } from '../SegmentedControl';
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

  it("caches a segmented control's well and the key gliding along it, so neither re-blurs as it moves", () => {
    const { theme } = renderInScheme(
      <SegmentedControl
        options={[
          { value: 'kg', label: 'kg' },
          { value: 'lb', label: 'lb' },
        ]}
        value="kg"
        onChange={jest.fn()}
        accessibilityLabel="Unit"
        testID="unit"
      />,
      scheme,
    );
    fireEvent(screen.getByTestId('unit'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
    });

    expect(styleOf(screen.getByTestId('unit')).boxShadow).toBeUndefined();
    const [track, pill] = screen.getAllByTestId('cached-surface');
    expect(lookOf(track!)).toMatchObject({ boxShadow: theme.material.inset.shadow });
    expect(styleOf(screen.getByTestId('unit-pill')).boxShadow).toBeUndefined();
    expect(lookOf(pill!)).toMatchObject({
      backgroundColor: theme.material.raisedSm.background,
      boxShadow: theme.material.raisedSm.shadow,
    });
  });

  it("caches a gold Button's raised look with room for its deeper shadow", () => {
    const { theme } = renderInScheme(<Button label="Start" onPress={jest.fn()} />, scheme);

    const cached = screen.getByTestId('cached-surface');
    expect(lookOf(cached)).toMatchObject({ boxShadow: theme.material.accent.shadow });
    // Room around the key for the gold's 4px offset and 12px blur ('card', not a small key's 12pt).
    expect(styleOf(cached)).toMatchObject({ top: -24, left: -24 });
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
