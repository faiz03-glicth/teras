import { fireEvent, screen } from '@testing-library/react-native';

import { cachedLookOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { accentStyle, surfaceStyle } from '@/theme';

import { Button } from '../Button';
import { Card } from '../Card';
import { SegmentedControl } from '../SegmentedControl';
import { StatTile } from '../StatTile';
import { Text } from '../Text';

/**
 * On Android a box shadow is blurred again on every frame its view moves (a scroll, a screen sliding), so a
 * screen of raised cards re-blurs two shadows per card per frame. A surface's look is drawn on its own,
 * behind the content, and the content above stays live. Parchment's shadows are drawn once into a texture
 * that is reused; Black has no shadow at all (its depth is native borders, part of the view's own background
 * drawable), so its surfaces are plain views with no layer (see cachedLookOf).
 */
describe.each(SCHEMES)('cached surfaces in %s', (scheme) => {
  it("draws a card's fill and depth once, behind its rows, not on the card itself", () => {
    const { theme } = renderInScheme(
      <Card testID="card">
        <Text>Row</Text>
      </Card>,
      scheme,
    );

    expect(styleOf(screen.getByTestId('card')).boxShadow).toBeUndefined();
    expect(styleOf(screen.getByTestId('card')).backgroundColor).toBeUndefined();
    expect(styleOf(screen.getByTestId('card')).borderWidth).toBeUndefined();
    expect(cachedLookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      ...surfaceStyle(theme.material.raised),
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

    expect(cachedLookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      ...surfaceStyle(theme.material.inset),
      backgroundColor: theme.colors.accentSoft,
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
    expect(cachedLookOf(track!)).toMatchObject(surfaceStyle(theme.material.inset));
    expect(styleOf(screen.getByTestId('unit-pill')).boxShadow).toBeUndefined();
    expect(cachedLookOf(pill!)).toMatchObject(surfaceStyle(theme.material.raisedSm));
  });

  it("caches a gold Button's raised look with room for its deeper shadow", () => {
    const { theme } = renderInScheme(<Button label="Start" onPress={jest.fn()} />, scheme);

    const cached = screen.getByTestId('cached-surface');
    expect(cachedLookOf(cached)).toMatchObject(accentStyle(theme.material.cta.narrow));
    // Room around the key for the gold's 4px offset and 12px blur ('card', not a small key's 12pt).
    expect(styleOf(cached)).toMatchObject({ top: -24, left: -24 });
  });

  it("caches a stat tile's raised look", () => {
    const { theme } = renderInScheme(<StatTile label="Active days" value={12} testID="tile" />, scheme);

    expect(styleOf(screen.getByTestId('tile')).boxShadow).toBeUndefined();
    expect(cachedLookOf(screen.getByTestId('cached-surface'))).toMatchObject(
      surfaceStyle(theme.material.raised),
    );
  });
});

describe('cached surfaces in Parchment', () => {
  it('draws its depth with a shadow, in a layer of its own', () => {
    renderInScheme(
      <Card testID="card">
        <Text>Row</Text>
      </Card>,
      'light',
    );

    const cached = screen.getByTestId('cached-surface');
    expect(cached.props.renderToHardwareTextureAndroid).toBe(true);
    expect(styleOf(cached.props.children)).toMatchObject({ boxShadow: expect.any(String) });
    expect(styleOf(cached.props.children).borderWidth).toBeUndefined();
  });
});

describe('cached surfaces in Black', () => {
  it('draws its depth with borders and no box-shadow, in no layer at all', () => {
    renderInScheme(
      <Card testID="card">
        <Text>Row</Text>
      </Card>,
      'dark',
    );

    const cached = screen.getByTestId('cached-surface');
    expect(cached.props.renderToHardwareTextureAndroid).toBe(false);
    const look = styleOf(cached.props.children);
    expect(look.boxShadow).toBeUndefined();
    expect(look).toMatchObject({
      backgroundColor: '#1B1B1B',
      borderWidth: 1,
      borderColor: '#2F2F2F',
      borderBottomWidth: 3,
      borderBottomColor: '#050505',
    });
  });

  it('draws a key held down with no ledge and a darker top edge', () => {
    renderInScheme(<Button label="Add set" variant="secondary" onPress={jest.fn()} />, 'dark');
    const key = () => screen.getByRole('button', { name: 'Add set' });
    const look = () => styleOf(screen.getByTestId('cached-surface').props.children);
    expect(look()).toMatchObject({ borderBottomWidth: 3, borderBottomColor: '#050505' });

    fireEvent(key(), 'pressIn');
    expect(look()).toMatchObject({
      borderBottomWidth: 1,
      borderBottomColor: '#2B2B2B',
      borderTopWidth: 3,
      borderTopColor: 'rgba(0,0,0,0.75)',
    });
    expect(look().boxShadow).toBeUndefined();

    fireEvent(key(), 'pressOut');
    expect(look()).toMatchObject({ borderBottomWidth: 3, borderBottomColor: '#050505' });
  });

  it("centres a key's label on its face, above the ledge inside its box", () => {
    renderInScheme(<Button label="Add set" variant="secondary" onPress={jest.fn()} />, 'dark');
    const key = styleOf(screen.getByRole('button', { name: 'Add set' }));

    // The box keeps its height; the 3px base takes 2px more from the bottom than the 1px rim from the top.
    expect(key).toMatchObject({ height: 50, paddingBottom: 2 });
  });

  it('draws the gold key with a bright top edge, on a thick ledge of its own darker gold', () => {
    renderInScheme(<Button label="Start" onPress={jest.fn()} />, 'dark');

    // The 50-tall key is the narrow one: a 4 thick ledge.
    expect(styleOf(screen.getByTestId('cached-surface').props.children)).toMatchObject({
      borderWidth: 1,
      borderColor: '#FFD179',
      borderTopColor: '#FFEAB0',
      borderBottomWidth: 4,
      borderBottomColor: '#6E4312',
    });
  });
});
