import { fireEvent, screen } from '@testing-library/react-native';

import { renderInScheme, styleOf } from '@test/render';

import { depthStyle, surfaceStyle } from '@/theme';

import { TrainingWave } from '../components/TrainingWave';

/** The Training wave's header, which opens the wave to six months, with its small raised key. */
function renderWave(scheme: 'light' | 'dark') {
  return renderInScheme(
    <TrainingWave
      testID="wave"
      rows={[]}
      dayLabels={[]}
      onDayPress={() => undefined}
      legendCaption="more"
      legend={false}
      header={{ title: 'Training wave', subtitle: 'Aug – Oct 2026 · 8 workouts', onToggle: () => undefined }}
    />,
    scheme,
  );
}

const toggle = () => screen.getByTestId('wave-toggle');
const key = () => styleOf(screen.getByTestId('training-wave-key'));

describe('the Training wave key, held', () => {
  it('stands on a ledge at rest, with the key corners', () => {
    const { theme } = renderWave('dark');

    expect(key()).toMatchObject({
      ...surfaceStyle(theme.material.raisedSm),
      width: 36,
      height: 36,
      borderRadius: theme.radii.key,
    });
  });

  it('takes the material pressed look in Black: no ledge, a deep shade, the same rounded corners', () => {
    const { theme } = renderWave('dark');

    fireEvent(toggle(), 'pressIn');

    expect(key()).toMatchObject({
      ...depthStyle(theme.material.pressed),
      borderRadius: theme.radii.key,
      borderBottomWidth: 1,
      borderTopWidth: 3,
      borderTopColor: 'rgba(0,0,0,0.75)',
    });
    // Deeper than the standing key, and made of borders alone: nothing blurs, nothing is inset.
    expect(theme.material.raisedSm.edges?.borderBottomWidth).toBeGreaterThan(
      key().borderBottomWidth as number,
    );
    expect(JSON.stringify(key())).not.toMatch(/boxShadow|inset/);

    fireEvent(toggle(), 'pressOut');
    expect(key()).toMatchObject({ borderBottomWidth: 2 });
  });

  it('keeps the Parchment pressed look as it was: the soft inner shadow, on the key corners', () => {
    const { theme } = renderWave('light');

    fireEvent(toggle(), 'pressIn');

    expect(key()).toMatchObject({ ...depthStyle(theme.material.pressed), borderRadius: theme.radii.key });
  });

  it('is no key at all while its header has nothing to open', () => {
    renderInScheme(
      <TrainingWave
        rows={[]}
        dayLabels={[]}
        onDayPress={() => undefined}
        legendCaption="more"
        legend={false}
        header={{ title: 'Training wave', subtitle: 'x' }}
      />,
      'dark',
    );

    expect(screen.queryByTestId('training-wave-key')).toBeNull();
  });
});
