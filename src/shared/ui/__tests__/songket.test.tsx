import { fireEvent, screen, within } from '@testing-library/react-native';

import { renderInScheme, styleOf } from '@test/render';

import { edgeRoom } from '@/theme';

import { Button, type ButtonSize } from '../Button';
import { Screen } from '../Screen';
import { Text } from '../Text';

const FACE = require('../../../../assets/songket/cta-face@3x.png') as number;
const DROP = require('../../../../assets/songket/cta-shadow.png') as number;

describe('the songket wall', () => {
  it.each(['light', 'dark'] as const)(
    'sits once behind a screen in %s, never in the way of a touch',
    (scheme) => {
      renderInScheme(
        <Screen scroll>
          <Text>Body</Text>
        </Screen>,
        scheme,
      );

      const walls = screen.getAllByTestId('songket-wall');
      expect(walls).toHaveLength(1);
      expect(styleOf(walls[0])).toMatchObject({ position: 'absolute', pointerEvents: 'none' });
      expect(walls[0]?.props.accessible).toBe(false);
    },
  );

  it.each([
    ['dark', require('../../../../assets/songket/ground-dark.png') as number],
    ['light', require('../../../../assets/songket/ground-light.png') as number],
  ] as const)('is the opaque ground image in %s, covering the screen with no fade-in', (scheme, ground) => {
    renderInScheme(
      <Screen>
        <Text>Body</Text>
      </Screen>,
      scheme,
    );

    const wall = screen.getByTestId('songket-wall');
    expect(wall.props.source).toEqual(ground);
    expect(wall.props.resizeMode).toBe('cover');
    expect(wall.props.fadeDuration).toBe(0);
  });

  it('shows a different image in each scheme', () => {
    const body = (
      <Screen>
        <Text>Body</Text>
      </Screen>
    );
    const { unmount } = renderInScheme(body, 'dark');
    const darkSource = screen.getByTestId('songket-wall').props.source;
    unmount();

    renderInScheme(body, 'light');

    expect(screen.getByTestId('songket-wall').props.source).not.toEqual(darkSource);
  });
});

describe('the engraved songket on a big gold button', () => {
  const press = () => screen.getByRole('button', { name: 'Finish workout' });

  it.each(['md', 'lg', 'xl'] as const)(
    'covers the whole face of a %s primary button in Black, edge to edge, with no measuring',
    (size) => {
      const { theme } = renderInScheme(
        <Button label="Finish workout" size={size} onPress={() => undefined} />,
        'dark',
      );

      // Drawn at once: no layout event is needed to decide whether it fits, because it lies under the label.
      const face = screen.getByTestId('gold-face');
      expect(face.props.pointerEvents).toBe('none');
      const cta = size === 'md' ? theme.material.cta.narrow : theme.material.cta.wide;
      const room = edgeRoom(cta);
      expect(styleOf(face)).toMatchObject({
        position: 'absolute',
        overflow: 'hidden',
        top: room.top,
        right: room.right,
        bottom: room.bottom,
        left: room.left,
      });

      // One picture, the shared tile, repeated across the full width and height of the face.
      const engraving = screen.getByTestId('gold-face-engraving');
      expect(engraving.props.source).toBe(FACE);
      expect(engraving.props.resizeMode).toBe('repeat');
      expect(engraving.props.fadeDuration).toBe(0);
      expect(engraving.props.accessible).toBe(false);
      expect(styleOf(engraving)).toMatchObject({
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
      expect(within(face).getByTestId('gold-face-engraving')).toBeTruthy();

      // The label stays a clean, readable label.
      expect(press()).toBeTruthy();
      expect(screen.getByText('Finish workout')).toBeTruthy();
    },
  );

  it('stands the tall keys on a 6 ledge and the shorter one on a 4 ledge, with a drop beneath', () => {
    const { theme } = renderInScheme(
      <Button label="Finish workout" size="xl" onPress={() => undefined} />,
      'dark',
    );
    expect(theme.material.cta.wide.edges?.borderBottomWidth).toBe(6);
    expect(theme.material.cta.narrow.edges?.borderBottomWidth).toBe(4);

    const drop = screen.getByTestId('gold-face-drop');
    expect(drop.props.source).toBe(DROP);
    expect(drop.props.resizeMode).toBe('stretch');
    expect(styleOf(drop)).toMatchObject({
      position: 'absolute',
      top: '100%',
      height: theme.material.cta.wide.face?.drop.height,
      opacity: 1,
      pointerEvents: 'none',
    });
    expect(screen.getByTestId('gold-face-underside')).toBeTruthy();
  });

  it('takes the ledge, band and drop away while held, and gives them back on release', () => {
    const { theme } = renderInScheme(<Button label="Finish workout" onPress={() => undefined} />, 'dark');
    const cta = theme.material.cta.narrow;
    expect(styleOf(screen.getByTestId('gold-face'))).toMatchObject({ bottom: edgeRoom(cta).bottom });

    fireEvent(press(), 'pressIn');
    // The face grows into the room the ledge left; the drop fades out; the band is gone.
    expect(styleOf(screen.getByTestId('gold-face'))).toMatchObject({
      top: edgeRoom(cta.pressed).top,
      bottom: edgeRoom(cta.pressed).bottom,
    });
    expect(edgeRoom(cta.pressed).bottom).toBeLessThan(edgeRoom(cta).bottom);
    expect(styleOf(screen.getByTestId('gold-face-drop')).opacity).toBe(0);
    expect(screen.queryByTestId('gold-face-underside')).toBeNull();
    // The engraving stays, and is the same picture.
    expect(screen.getByTestId('gold-face-engraving').props.source).toBe(FACE);

    fireEvent(press(), 'pressOut');
    expect(styleOf(screen.getByTestId('gold-face'))).toMatchObject({ bottom: edgeRoom(cta).bottom });
    expect(screen.getByTestId('gold-face-underside')).toBeTruthy();
  });

  it('draws nothing live: no box-shadow, no inset shadow, in the key at rest or held', () => {
    renderInScheme(<Button label="Finish workout" size="xl" onPress={() => undefined} />, 'dark');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/boxShadow|inset|gradient|blur/i);

    fireEvent(press(), 'pressIn');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/boxShadow|inset|gradient|blur/i);
  });

  it('is left off Parchment, which keeps its plain gold', () => {
    renderInScheme(<Button label="Finish workout" onPress={() => undefined} />, 'light');

    expect(screen.queryByTestId('gold-face')).toBeNull();
    expect(screen.queryByTestId('gold-face-drop')).toBeNull();
  });

  it.each(['secondary', 'ghost', 'quiet', 'danger'] as const)('is left off a %s button', (variant) => {
    renderInScheme(<Button label="Finish workout" variant={variant} onPress={() => undefined} />, 'dark');

    expect(screen.queryByTestId('gold-face')).toBeNull();
  });

  it.each(['sm'] as ButtonSize[])('is left off the %s primary button, which keeps its plain gold', (size) => {
    renderInScheme(<Button label="Finish workout" size={size} onPress={() => undefined} />, 'dark');

    expect(screen.queryByTestId('gold-face')).toBeNull();
  });

  it('sets the label of a held gold key onto its taller face, with no ledge to lift it', () => {
    renderInScheme(<Button label="Finish workout" size="xl" onPress={() => undefined} />, 'dark');
    // Standing: the 6 ledge takes 5 more than the 1px top edge; held, the shade takes the top instead.
    expect(styleOf(press())).toMatchObject({ height: 56, paddingBottom: 5 });

    fireEvent(press(), 'pressIn');
    expect(styleOf(press())).toMatchObject({ paddingBottom: 0 });
  });
});
