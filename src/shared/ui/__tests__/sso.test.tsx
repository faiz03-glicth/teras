import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { SsoButton } from '../SsoButton';

describe.each(SCHEMES)('SsoButton in %s', (scheme) => {
  it('Apple uses the native button in the HIG colour for the scheme', () => {
    const onPress = jest.fn();
    renderInScheme(<SsoButton provider="apple" onPress={onPress} />, scheme);
    const button = screen.getByRole('button', { name: 'Sign in with Apple' });
    expect(button.props.accessibilityHint).toBe(scheme === 'dark' ? 'white' : 'black');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it('Google uses brand colours and Roboto Medium', () => {
    const { theme } = renderInScheme(<SsoButton provider="google" onPress={jest.fn()} />, scheme);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(styleOf(button).backgroundColor).toBe(theme.brand.google.background);
    expect(styleOf(screen.getByText('Continue with Google')).fontFamily).toBe('Roboto_500Medium');
  });

  it.each(['apple', 'google'] as const)('%s shows "Connecting…" while busy', (provider) => {
    renderInScheme(<SsoButton provider={provider} busy onPress={jest.fn()} />, scheme);
    const busy = screen.getByRole('button', { name: 'Connecting…' });
    expect(busy.props.accessibilityState).toEqual({ busy: true, disabled: true });
  });

  it('a disabled Google button is dimmed and inert', () => {
    const onPress = jest.fn();
    renderInScheme(<SsoButton provider="google" disabled onPress={onPress} />, scheme);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(styleOf(button).opacity).toBe(0.45);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SsoButton on Android', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it('renders nothing for Apple', () => {
    Platform.OS = 'android';
    renderInScheme(<SsoButton provider="apple" onPress={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
