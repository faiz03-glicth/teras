import { fireEvent, screen } from '@testing-library/react-native';

import { buildLevelGrid } from '@/features/heatmap/domain/grid';
import { childrenOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { HeatCell } from '../HeatCell';
import { Heatmap } from '../Heatmap';

describe.each(SCHEMES)('heatmap components in %s', (scheme) => {
  it('HeatCell paints the palette step for its level', () => {
    const { theme, toJSON } = renderInScheme(<HeatCell level={3} size={20} />, scheme);
    const node = toJSON();
    expect(styleOf(node).backgroundColor).toBe(theme.heat[3]);
  });

  it('HeatCell outlines today and hides future days', () => {
    const { theme, toJSON, rerender } = renderInScheme(
      <HeatCell level={1} size={14} state="today" />,
      scheme,
    );
    let node = toJSON();
    let style = styleOf(node);
    expect(style.outlineColor).toBe(theme.colors.text);
    expect(style.outlineWidth).toBe(1.5);

    rerender(<HeatCell level={1} size={14} state="future" />);
    node = toJSON();
    style = styleOf(node);
    expect(style.backgroundColor).toBe('transparent');
  });

  it('the animated variant (pulse) keeps the same look as a static cell', () => {
    const { theme, toJSON } = renderInScheme(<HeatCell level={4} size={20} pulse />, scheme);
    expect(styleOf(toJSON())).toMatchObject({ backgroundColor: theme.heat[4], width: 20, height: 20 });
  });

  it('interactive HeatCell is a labelled button', () => {
    const onPress = jest.fn();
    renderInScheme(
      <HeatCell level={2} size={14} onPress={onPress} accessibilityLabel="Sep 24: Strong" />,
      scheme,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Sep 24: Strong' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('decorative Heatmap renders every cell but hides them from screen readers', () => {
    const grid = buildLevelGrid(14, 7, (c, r) => ((c + r) % 5) as 0 | 1 | 2 | 3 | 4);
    const { toJSON } = renderInScheme(<Heatmap grid={grid} cellSize={20} gap={5} animateIn />, scheme);
    const root = toJSON();
    expect(root && !Array.isArray(root) && root.props.accessibilityElementsHidden).toBe(true);
    expect(childrenOf(root).length).toBe(14);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('interactive Heatmap reports the pressed day', () => {
    const onDayPress = jest.fn();
    const grid = {
      columns: [[{ key: '2026-09-24', level: 2 as const, state: 'today' as const, label: 'Sep 24: Strong' }]],
    };
    renderInScheme(<Heatmap grid={grid} interactive onDayPress={onDayPress} />, scheme);
    fireEvent.press(screen.getByRole('button', { name: 'Sep 24: Strong' }));
    expect(onDayPress).toHaveBeenCalledWith('2026-09-24');
  });
});
