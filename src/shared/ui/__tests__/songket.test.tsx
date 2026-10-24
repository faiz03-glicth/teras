import { fireEvent, screen } from '@testing-library/react-native';

import { renderInScheme, styleOf } from '@test/render';

import { Button } from '../Button';
import { Screen } from '../Screen';
import { ctaMotifFits } from '../SongketCta';
import { Text } from '../Text';

const layout = (width: number, height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height } },
});

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

describe('the songket on a big gold button', () => {
  const pressWide = () => {
    fireEvent(screen.getByRole('button'), 'layout', layout(320, 50));
    fireEvent(screen.getByText('Finish workout'), 'layout', layout(130, 22));
  };

  it('fits only a button that is big enough and leaves the label clear', () => {
    expect(ctaMotifFits(320, 50, 130)).toBe(true);
    // Too narrow, too short, or a label that would run under the thread.
    expect(ctaMotifFits(199, 50, 60)).toBe(false);
    expect(ctaMotifFits(320, 47, 130)).toBe(false);
    expect(ctaMotifFits(240, 50, 130)).toBe(false);
    // Nothing is drawn before the label has been measured.
    expect(ctaMotifFits(320, 50, 0)).toBe(false);
  });

  it('is pressed into the primary button in Black once it is measured', () => {
    renderInScheme(<Button label="Finish workout" onPress={() => undefined} />, 'dark');
    expect(screen.queryByTestId('songket-cta')).toBeNull();

    pressWide();

    const motif = screen.getByTestId('songket-cta');
    expect(motif.props.pointerEvents).toBe('none');
    expect(styleOf(motif)).toMatchObject({ position: 'absolute', overflow: 'hidden' });
    // The label stays a clean, readable label.
    expect(screen.getByRole('button', { name: 'Finish workout' })).toBeTruthy();
  });

  it('is left off a narrow button', () => {
    renderInScheme(<Button label="Finish workout" onPress={() => undefined} />, 'dark');
    fireEvent(screen.getByRole('button'), 'layout', layout(180, 50));
    fireEvent(screen.getByText('Finish workout'), 'layout', layout(130, 22));

    expect(screen.queryByTestId('songket-cta')).toBeNull();
  });

  it('is left off Parchment, which keeps its plain gold', () => {
    renderInScheme(<Button label="Finish workout" onPress={() => undefined} />, 'light');
    pressWide();

    expect(screen.queryByTestId('songket-cta')).toBeNull();
  });

  it.each(['secondary', 'ghost', 'danger'] as const)('is left off a %s button', (variant) => {
    renderInScheme(<Button label="Finish workout" variant={variant} onPress={() => undefined} />, 'dark');
    pressWide();

    expect(screen.queryByTestId('songket-cta')).toBeNull();
  });

  it('is left off the small button', () => {
    renderInScheme(<Button label="Finish workout" size="sm" onPress={() => undefined} />, 'dark');
    pressWide();

    expect(screen.queryByTestId('songket-cta')).toBeNull();
  });
});
