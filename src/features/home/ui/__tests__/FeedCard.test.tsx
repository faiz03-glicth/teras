import { fireEvent, screen } from '@testing-library/react-native';

import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { FeedCard } from '../components/FeedCard';
import type { FeedEntry } from '../useHomeViewModel';

const entry: FeedEntry = {
  id: 'w1',
  name: 'Push Day',
  when: 'Today · 18:20',
  level: 3,
  levelName: 'Strong',
  stats: [
    { label: 'Time', value: '62 min' },
    { label: 'Volume', value: '4,820 kg' },
    { label: 'Sets', value: '14' },
  ],
  lines: [{ sets: '4 sets', name: 'Bench Press (Barbell)' }],
  more: null,
  accessibilityLabel: 'Push Day, today',
};

/**
 * Home fades in, slides back and scrolls under its cards: a card's two shadows are drawn behind it from
 * prerendered bitmaps (CachedSurface), never blurred again on the card itself.
 */
describe.each(SCHEMES)('a feed card in %s', (scheme) => {
  it('draws its fill and shadows behind its content, not on the card', () => {
    const { theme } = renderInScheme(<FeedCard entry={entry} onPress={jest.fn()} />, scheme);

    expect(styleOf(screen.getByTestId('feed-w1')).boxShadow).toBeUndefined();
    expect(styleOf(screen.getByTestId('feed-w1')).backgroundColor).toBeUndefined();
    expect(styleOf(screen.getByTestId('cached-surface').props.children)).toMatchObject({
      backgroundColor: theme.material.raised.background,
      boxShadow: theme.material.raised.shadow,
      borderRadius: theme.radii.card,
    });
  });

  it('sinks into the material while held, and rises again when let go', () => {
    const { theme } = renderInScheme(<FeedCard entry={entry} onPress={jest.fn()} />, scheme);
    const look = () => styleOf(screen.getByTestId('cached-surface').props.children);

    fireEvent(screen.getByTestId('feed-w1'), 'pressIn');
    expect(look().boxShadow).toBe(theme.material.pressed.shadow);

    fireEvent(screen.getByTestId('feed-w1'), 'pressOut');
    expect(look().boxShadow).toBe(theme.material.raised.shadow);
  });
});
