import { screen, within } from '@testing-library/react-native';

import { Icon, StatTile } from '@/shared/ui';
import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { RestBar } from '../components/RestBar';
import { SavedChip } from '../components/SavedChip';
import { UndoBar } from '../components/UndoBar';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

/** The workout's small controls, in both schemes: gold only where it means something. */
describe.each(SCHEMES)('the workout controls in %s', (scheme) => {
  it('writes Undo as a link in the text colour with an underline, never in gold', () => {
    const { theme } = renderInScheme(<UndoBar label="Set 2 deleted" onUndo={jest.fn()} />, scheme);

    const undo = styleOf(screen.getByText('Undo'));
    expect(undo).toMatchObject({ color: theme.colors.text, textDecorationLine: 'underline' });
    expect(undo.color).not.toBe(theme.colors.accentText);
    // 40 tall with 8 of slop all round.
    const press = screen.getByTestId('undo-bar-undo');
    expect(styleOf(press).height).toBe(40);
    expect(press.props.hitSlop).toBe(8);
  });

  it('draws the rest bar with a quiet clock icon and Skip in text2, each key a 48dp target', () => {
    const { theme } = renderInScheme(
      <RestBar
        endsAt={new Date(Date.now() + 90_000).toISOString()}
        onLess={jest.fn()}
        onMore={jest.fn()}
        onSkip={jest.fn()}
        onOver={jest.fn()}
      />,
      scheme,
    );

    expect(styleOf(screen.getByText('Skip')).color).toBe(theme.colors.text2);
    const clock = within(screen.getByLabelText(/^Rest, /))
      .UNSAFE_getAllByType(Icon)
      .find((icon) => icon.props.name === 'clock');
    expect(clock?.props.color).toBe(theme.colors.text2);
    ['Take off 15 seconds', 'Add 15 seconds', 'Skip rest'].forEach((name) => {
      const key = screen.getByRole('button', { name });
      expect(Number(styleOf(key).height) + 2 * Number(key.props.hitSlop)).toBe(48);
    });
  });

  it('says that the workout is saved on this phone with a success check, and no lift', () => {
    const { theme } = renderInScheme(<SavedChip />, scheme);

    const chip = screen.getByLabelText('Workout saved on this phone');
    expect(within(chip).getByText('Saved on this phone')).toBeTruthy();
    expect(within(chip).UNSAFE_getByType(Icon).props.color).toBe(theme.colors.success);
    expect(styleOf(chip)).toMatchObject({
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.subtle,
    });
    expect(styleOf(chip).boxShadow).toBeUndefined();
    expect(styleOf(within(chip).getByText('Saved on this phone')).color).toBe(theme.colors.text2);
  });

  it('says Saving… instead while it is being written', () => {
    renderInScheme(<SavedChip saving />, scheme);

    expect(screen.getByLabelText('Saving workout')).toBeTruthy();
    expect(screen.getByText('Saving…')).toBeTruthy();
  });

  it('draws a flat stat tile as a surface with a 1px border, and a raised one as before', () => {
    const { theme } = renderInScheme(
      <>
        <StatTile label="Volume" value="855 kg" flat />
        <StatTile label="Sets" value="2" />
      </>,
      scheme,
    );

    const flat = screen.getByLabelText('Volume, 855 kg');
    expect(styleOf(flat)).toMatchObject({
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    });
    expect(styleOf(flat).boxShadow).toBeUndefined();
    expect(within(flat).queryByTestId('cached-surface')).toBeNull();
    // Same size as a raised tile: the border takes a point of the padding.
    expect(styleOf(flat).padding).toBe(13);

    const raised = screen.getByLabelText('Sets, 2');
    expect(styleOf(raised).borderWidth).toBeUndefined();
    expect(within(raised).getByTestId('cached-surface')).toBeTruthy();
  });
});
