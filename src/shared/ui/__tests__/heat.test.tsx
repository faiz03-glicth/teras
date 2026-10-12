import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { buildLevelGrid } from '@/features/heatmap/domain/grid';
import { checkInPulse, heatmapReveal } from '@/theme/motion/cssMotion';
import { childrenOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { HeatCell } from '../HeatCell';
import { Heatmap } from '../Heatmap';

/**
 * The animation a labelled cell is given. jest's Reanimated drops CSS animation props from the host tree,
 * so this reads them off the rendered components: the button itself must carry the animation.
 */
function animationOf(label: string) {
  const carriers = screen.UNSAFE_root.findAll(
    (node) => node.props.accessibilityLabel === label && StyleSheet.flatten(node.props.style)?.animationName,
  );
  return carriers.length ? StyleSheet.flatten(carriers[0]!.props.style).animationName : undefined;
}

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

  it('HeatCell carves an empty day into the card, in place of its outline', () => {
    const { theme, toJSON, rerender } = renderInScheme(<HeatCell level={0} size={14} outlined />, scheme);
    const { carved } = theme.material;
    // The dent's edges, the shade up-left and the light down-right: a border, never a blurred inner shadow.
    const dent = {
      borderWidth: carved.edge,
      borderTopColor: carved.shade,
      borderLeftColor: carved.shade,
      borderBottomColor: carved.light,
      borderRightColor: carved.light,
    };
    let style = styleOf(toJSON());
    expect(style.backgroundColor).toBe(carved.background);
    expect(style).toMatchObject(dent);
    expect(style.boxShadow).toBeUndefined();
    // The dent takes the outline's place.
    expect(style.borderColor).toBeUndefined();

    // Today with no workout yet is still a dent, ringed like any today.
    rerender(<HeatCell level={0} size={14} state="today" />);
    style = styleOf(toJSON());
    expect(style).toMatchObject(dent);
    expect(style.outlineWidth).toBe(1.5);

    // A day still to come is not carved: it hasn't happened yet.
    rerender(<HeatCell level={0} size={14} state="future" />);
    style = styleOf(toJSON());
    expect(style.borderTopColor).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
    expect(style.backgroundColor).toBe('transparent');
  });

  it('HeatCell marks a day checked in on Streak with a small bead in the dent', () => {
    const { theme, toJSON } = renderInScheme(<HeatCell level={0} size={20} marked />, scheme);
    const node = toJSON();
    const [dot] = childrenOf(node);
    const bead = dot && typeof dot !== 'string' ? styleOf(dot) : {};
    expect(bead.backgroundColor).toBe(theme.colors.accentText);
    // Centred in the dent: a 7pt bead (36% of 20) placed from inside the edges, so they come off.
    const offset = (20 - 7) / 2 - theme.material.carved.edge;
    expect(bead).toMatchObject({ width: 7, top: offset, left: offset });
  });

  it('never marks a cell that is not carved, whatever `marked` says', () => {
    // A trained day: Streak and a logged workout never claim the same cell.
    const { toJSON: trained } = renderInScheme(<HeatCell level={2} size={20} marked />, scheme);
    expect(childrenOf(trained())).toHaveLength(0);

    // A day still to come: nothing has happened there yet to be checked in on.
    const { toJSON: future } = renderInScheme(<HeatCell level={0} size={20} state="future" marked />, scheme);
    expect(childrenOf(future())).toHaveLength(0);
  });

  it('HeatCell keeps a day you trained flat, in its own colour', () => {
    const { theme, toJSON } = renderInScheme(<HeatCell level={2} size={14} outlined />, scheme);
    const style = styleOf(toJSON());
    expect(style.boxShadow).toBeUndefined();
    expect(style.backgroundColor).toBe(theme.heat[2]);
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

  it('a pressable cell keeps its reveal and its pulse, and still presses (P5)', () => {
    const onPress = jest.fn();
    const reveal = heatmapReveal(2, 3);
    const { rerender } = renderInScheme(
      <HeatCell level={2} size={14} appear={reveal} onPress={onPress} accessibilityLabel="Sep 24: Strong" />,
      scheme,
    );
    expect(animationOf('Sep 24: Strong')).toBe(reveal.animationName);
    fireEvent.press(screen.getByRole('button', { name: 'Sep 24: Strong' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<HeatCell level={2} size={14} pulse onPress={onPress} accessibilityLabel="Sep 24: Strong" />);
    expect(animationOf('Sep 24: Strong')).toBe(checkInPulse.animationName);
    fireEvent.press(screen.getByRole('button', { name: 'Sep 24: Strong' }));
    expect(onPress).toHaveBeenCalledTimes(2);
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
