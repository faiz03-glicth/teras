import { fireEvent, screen } from '@testing-library/react-native';

import { childrenOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { Avatar } from '../Avatar';
import { Banner } from '../Banner';
import { Button } from '../Button';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { NavBar } from '../NavBar';
import { OrDivider } from '../OrDivider';
import { PageDots } from '../PageDots';
import { Text } from '../Text';
import { Toggle } from '../Toggle';

describe.each(SCHEMES)('primitives in %s', (scheme) => {
  it('Text uses the tone colour and typography variant', () => {
    const { theme } = renderInScheme(
      <Text variant="display" tone="secondary">
        Hello
      </Text>,
      scheme,
    );
    const style = styleOf(screen.getByText('Hello'));
    expect(style.color).toBe(theme.colors.text2);
    expect(style.fontSize).toBe(30);
  });

  it('Button is an accessible button that shows its loading label', () => {
    const onPress = jest.fn();
    const { theme, rerender } = renderInScheme(<Button label="Get started" onPress={onPress} />, scheme);
    const button = screen.getByRole('button', { name: 'Get started' });
    expect(styleOf(button).backgroundColor).toBe(theme.colors.accent);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<Button label="Send code" loading loadingLabel="Sending…" onPress={onPress} />);
    const busy = screen.getByRole('button', { name: 'Sending…' });
    expect(busy.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(busy);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled Button is dimmed and inert', () => {
    const onPress = jest.fn();
    renderInScheme(<Button label="Send code" disabled onPress={onPress} />, scheme);
    const button = screen.getByRole('button', { name: 'Send code' });
    expect(styleOf(button).opacity).toBe(0.45);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('IconButton exposes its label and a 44pt touch target', () => {
    renderInScheme(<IconButton icon="chevron-left" onPress={jest.fn()} accessibilityLabel="Back" />, scheme);
    const button = screen.getByRole('button', { name: 'Back' });
    expect(button.props.hitSlop).toBe(5);
  });

  it('NavBar shows a header title and back button', () => {
    const onBack = jest.fn();
    renderInScheme(<NavBar title="Settings" onBack={onBack} right={<Text>Skip</Text>} />, scheme);
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('Card uses the surface colour and draws dividers between rows', () => {
    const { theme, toJSON } = renderInScheme(
      <Card divided>
        <Text>One</Text>
        <Text>Two</Text>
        <Text>Three</Text>
      </Card>,
      scheme,
    );
    const root = toJSON();
    expect(styleOf(root).backgroundColor).toBe(theme.colors.surface);
    expect(childrenOf(root).length).toBe(5);
  });

  it('Toggle is a labelled switch tinted with the readable gold', () => {
    const onChange = jest.fn();
    const { theme } = renderInScheme(
      <Toggle value onChange={onChange} accessibilityLabel="Daily reminder" />,
      scheme,
    );
    const toggle = screen.getByLabelText('Daily reminder');
    expect(toggle.props.onTintColor ?? toggle.props.trackColor?.true).toBe(theme.colors.accentText);
    fireEvent(toggle, 'valueChange', false);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('Banner announces its message as an alert', () => {
    const { theme } = renderInScheme(<Banner message="You're offline." />, scheme);
    const banner = screen.getByRole('alert');
    expect(banner.props.accessibilityLabel).toBe("You're offline.");
    expect(styleOf(banner).backgroundColor).toBe(theme.colors.dangerSoft);
  });

  it('PageDots reads as step progress', () => {
    renderInScheme(<PageDots count={3} index={1} />, scheme);
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
  });

  it('OrDivider, Avatar and EmptyState render their content', () => {
    const onPress = jest.fn();
    renderInScheme(
      <>
        <OrDivider />
        <Avatar name="Faiz Ahmad" />
        <EmptyState
          icon="sparkles"
          title="Nothing yet"
          body="Check back soon."
          action={{ label: 'Add', onPress }}
        />
      </>,
      scheme,
    );
    // Divider and avatar are decorative: rendered, but hidden from screen readers.
    expect(screen.queryByText('or')).toBeNull();
    expect(screen.getByText('or', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('FA', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Nothing yet' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onPress).toHaveBeenCalled();
  });
});
