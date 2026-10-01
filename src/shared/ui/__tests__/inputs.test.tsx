import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { renderInScheme, SCHEMES } from '@test/render';

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
});
