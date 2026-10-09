import { fireEvent, screen } from '@testing-library/react-native';

import { childrenOf, renderInScheme, SCHEMES, styleOf } from '@test/render';

import { Avatar } from '../Avatar';
import { Banner } from '../Banner';
import { BarChart } from '../BarChart';
import { Button } from '../Button';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { Icon } from '../Icon';
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

  it.each(['ghost', 'quiet'] as const)('a %s Button is a small raised key, not bare text', (variant) => {
    const { theme } = renderInScheme(
      <Button label="Add set" variant={variant} size="sm" onPress={jest.fn()} />,
      scheme,
    );
    expect(styleOf(screen.getByRole('button', { name: 'Add set' }))).toMatchObject({
      height: 36,
      borderRadius: theme.radii.control,
      backgroundColor: theme.material.raisedSm.background,
      boxShadow: theme.material.raisedSm.shadow,
    });
    // Under a finger the lift gives way to a shallow press, as on every other key.
    fireEvent(screen.getByRole('button', { name: 'Add set' }), 'pressIn');
    expect(styleOf(screen.getByRole('button', { name: 'Add set' })).boxShadow).toBe(
      theme.material.pressed.shadow,
    );
  });

  it('a small Button still reaches a 44pt touch target', () => {
    renderInScheme(<Button label="Skip" variant="ghost" size="sm" onPress={jest.fn()} />, scheme);
    expect(screen.getByRole('button', { name: 'Skip' }).props.hitSlop).toBe(4);
  });

  it('a large Button stands as tall as the sign-in buttons', () => {
    renderInScheme(
      <Button label="Continue with email" variant="secondary" size="lg" onPress={jest.fn()} />,
      scheme,
    );
    expect(styleOf(screen.getByRole('button', { name: 'Continue with email' })).height).toBe(52);
  });

  it('IconButton is a raised square key with a 44pt touch target', () => {
    const { theme } = renderInScheme(
      <IconButton icon="chevron-left" onPress={jest.fn()} accessibilityLabel="Back" />,
      scheme,
    );
    const button = screen.getByRole('button', { name: 'Back' });
    expect(styleOf(button)).toMatchObject({
      width: 40,
      height: 40,
      borderRadius: theme.radii.key,
      backgroundColor: theme.material.raisedSm.background,
      boxShadow: theme.material.raisedSm.shadow,
    });
    expect(button.props.hitSlop).toBe(2);
    fireEvent(button, 'pressIn');
    expect(styleOf(screen.getByRole('button', { name: 'Back' })).boxShadow).toBe(
      theme.material.pressed.shadow,
    );
  });

  it('a plain IconButton is an icon printed on the surface, still a 44pt target', () => {
    renderInScheme(<IconButton icon="pencil" plain onPress={jest.fn()} accessibilityLabel="Edit" />, scheme);
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(styleOf(button).backgroundColor).toBe('transparent');
    expect(styleOf(button).boxShadow).toBeUndefined();
    expect(button.props.hitSlop).toBe(5);
  });

  it('a danger IconButton keeps its key and draws the icon in the danger colour', () => {
    const { theme } = renderInScheme(
      <IconButton icon="trash" tone="danger" onPress={jest.fn()} accessibilityLabel="Remove Squat" />,
      scheme,
    );
    expect(styleOf(screen.getByRole('button', { name: 'Remove Squat' })).backgroundColor).toBe(
      theme.material.raisedSm.background,
    );
    expect(screen.UNSAFE_getByType(Icon).props.color).toBe(theme.colors.danger);
  });

  it('NavBar shows a header title and a raised back key', () => {
    const onBack = jest.fn();
    const { theme } = renderInScheme(
      <NavBar title="Settings" onBack={onBack} right={<Text>Skip</Text>} />,
      scheme,
    );
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    const back = screen.getByRole('button', { name: 'Back' });
    expect(styleOf(back).backgroundColor).toBe(theme.material.raisedSm.background);
    fireEvent.press(back);
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('Card draws dividers between rows, over its raised surface', () => {
    const { toJSON } = renderInScheme(
      <Card divided>
        <Text>One</Text>
        <Text>Two</Text>
        <Text>Three</Text>
      </Card>,
      scheme,
    );
    // The cached raised surface (cachedSurface.test), then three rows with a divider between each.
    expect(childrenOf(toJSON()).length).toBe(6);
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

describe('BarChart', () => {
  it('keeps room for a set number of bars, so a short history draws narrow bars, not wide ones', () => {
    renderInScheme(
      <BarChart values={[60, 62.5]} slots={12} accessibilityLabel="Best set each week" />,
      'light',
    );

    expect(screen.getAllByTestId('bar-space')).toHaveLength(10);
  });

  it('needs no room kept once the bars fill it', () => {
    renderInScheme(<BarChart values={[1, 2, 3]} slots={2} accessibilityLabel="Chart" />, 'light');

    expect(screen.queryAllByTestId('bar-space')).toHaveLength(0);
  });
});
