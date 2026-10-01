import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { ColorScheme, VisualStyle } from '@/theme/types';
import { getTestTheme, setTestTheme } from '@test/mocks/unistyles';
import { SCHEMES, styleOf } from '@test/render';

import { Backdrop } from '../Backdrop';
import { Card } from '../Card';
import { Screen } from '../Screen';
import { Text } from '../Text';

const processBackgroundImage = require('react-native/Libraries/StyleSheet/processBackgroundImage')
  .default as (value: string) => unknown[];

/** Renders in a scheme and a visual style (the shared helper always renders Classic). */
function renderIn(ui: ReactElement, scheme: ColorScheme, style: VisualStyle) {
  setTestTheme(scheme, style);
  return { ...render(ui), theme: getTestTheme() };
}

describe.each(SCHEMES)('Liquid Glass in %s (every platform)', (scheme) => {
  it('draws the glowing backdrop behind every screen', () => {
    const { theme, toJSON } = renderIn(<Backdrop />, scheme, 'glass');
    expect(styleOf(toJSON()).experimental_backgroundImage).toBe(theme.glass?.backdrop);
  });

  it('uses gradients React Native can draw: three glows, none dropped', () => {
    const { theme } = renderIn(<Backdrop />, scheme, 'glass');
    expect(processBackgroundImage(theme.glass?.backdrop ?? '')).toHaveLength(3);
  });

  it('lights glass cards', () => {
    const { theme, toJSON } = renderIn(
      <Card>
        <Text>Pane</Text>
      </Card>,
      scheme,
      'glass',
    );
    expect(styleOf(toJSON()).boxShadow).toBe(theme.glass?.card.shadow);
  });

  it('Classic keeps the plain canvas: no backdrop, content as before', () => {
    const { toJSON } = renderIn(<Backdrop />, scheme, 'classic');
    expect(toJSON()).toBeNull();
    renderIn(
      <Screen>
        <Text>Content</Text>
      </Screen>,
      scheme,
      'classic',
    );
    expect(screen.getByText('Content')).toBeTruthy();
  });
});

afterAll(() => setTestTheme('light'));
