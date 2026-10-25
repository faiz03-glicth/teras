import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { cachedLookOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { depthStyle, surfaceStyle } from '@/theme';

import { ChipRow } from '../Chip';
import { OtpInput } from '../OtpInput';
import { TextField } from '../TextField';

function ControlledOtp({ onComplete }: { onComplete: (code: string) => void }) {
  const [code, setCode] = useState('');
  return <OtpInput value={code} onChangeText={setCode} onComplete={onComplete} />;
}

describe.each(SCHEMES)('inputs in %s', (scheme) => {
  it('TextField is labelled, themed and shows its error', () => {
    const { theme } = renderInScheme(
      <TextField label="Email" icon="mail" placeholder="you@example.com" error="Enter a valid email" />,
      scheme,
    );
    const input = screen.getByLabelText('Email');
    expect(input.props.placeholderTextColor).toBe(theme.colors.text3);
    expect(input.props.keyboardAppearance).toBe(scheme);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it("TextField draws its well's inner shadow once, inside its edge, so a sliding screen never re-blurs it", () => {
    const { theme } = renderInScheme(<TextField label="Search" icon="search" />, scheme);
    expect(cachedLookOf(screen.getByTestId('cached-surface'))).toMatchObject({
      borderRadius: theme.radii.control - 1,
      ...depthStyle(theme.material.inset),
    });
    // That texture is the only shadow the field draws: nothing around it blurs live. (Black has no shadow
    // at all: its well is a rim and a lip drawn as borders.)
    const shadowed = screen.UNSAFE_root.findAll(
      (node) => typeof node.type === 'string' && styleOf(node).boxShadow !== undefined,
    );
    expect(shadowed).toHaveLength(theme.material.inset.shadow === undefined ? 0 : 1);
  });

  it('OtpInput keeps digits only and completes once on the sixth digit', () => {
    const onComplete = jest.fn();
    renderInScheme(<ControlledOtp onComplete={onComplete} />, scheme);
    const input = screen.getByLabelText('Verification code');
    expect(input.props.textContentType).toBe('oneTimeCode');
    expect(input.props.autoComplete).toBe('one-time-code');

    fireEvent.changeText(input, '12a3');
    // The digit boxes are visual only; screen readers use the input itself.
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.changeText(input, '123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('OtpInput shows its error', () => {
    renderInScheme(<OtpInput value="" onChangeText={jest.fn()} error="That code didn't work." />, scheme);
    expect(screen.getByRole('alert')).toHaveTextContent("That code didn't work.");
  });

  it('ChipRow: raised keys, the chosen one pressed in with a gold label', () => {
    const onChange = jest.fn();
    const { theme } = renderInScheme(
      <ChipRow
        options={[
          { value: 'all', label: 'All' },
          { value: 'chest', label: 'Chest' },
        ]}
        value="all"
        onChange={onChange}
        accessibilityLabel="Muscle"
      />,
      scheme,
    );
    expect(styleOf(screen.getByRole('radio', { name: 'All' }))).toMatchObject({
      borderRadius: theme.radii.key,
      ...surfaceStyle(theme.material.inset),
    });
    expect(styleOf(screen.getByText('All')).color).toBe(theme.colors.accentText);
    expect(styleOf(screen.getByRole('radio', { name: 'Chest' }))).toMatchObject({
      borderRadius: theme.radii.key,
      ...surfaceStyle(theme.material.raisedSm),
    });
    expect(styleOf(screen.getByText('Chest')).color).toBe(theme.colors.text);
    fireEvent.press(screen.getByRole('radio', { name: 'Chest' }));
    expect(onChange).toHaveBeenCalledWith('chest');
  });
});
