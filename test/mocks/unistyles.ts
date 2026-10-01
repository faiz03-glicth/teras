/**
 * Jest replacement for react-native-unistyles.
 * Unlike the library's own mock (which resolves styles once, at import time, against the first theme),
 * styles here resolve lazily at render time against the current test theme, so the same component can
 * be rendered in light and dark within one test file.
 */
import { createElement, type ComponentType } from 'react';

import { buildTheme } from '@/theme/buildTheme';
import type { ColorScheme, HeatPaletteId, Theme, VisualStyle } from '@/theme/types';

let currentTheme: Theme = buildTheme('light', 'meadow', 'classic');

export function setTestTheme(
  scheme: ColorScheme,
  style: VisualStyle = 'classic',
  palette: HeatPaletteId = 'meadow',
) {
  currentTheme = buildTheme(scheme, palette, style);
}

export function getTestTheme(): Theme {
  return currentTheme;
}

const miniRuntime = {
  themeName: 'light',
  colorScheme: 'light',
  hasAdaptiveThemes: false,
  breakpoint: 'xs',
  contentSizeCategory: 'Medium',
  insets: { top: 0, bottom: 0, left: 0, right: 0, ime: 0 },
  screen: { width: 390, height: 844 },
  statusBar: { width: 390, height: 47 },
  navigationBar: { width: 0, height: 0 },
  pixelRatio: 3,
  fontScale: 1,
  rtl: false,
  isLandscape: false,
  isPortrait: true,
};

type StyleFactory =
  Record<string, unknown> | ((theme: Theme, rt: typeof miniRuntime) => Record<string, unknown>);

export const StyleSheet = {
  configure: () => undefined,
  hairlineWidth: 1,
  absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  compose: (styles: unknown) => styles,
  flatten: (styles: unknown) => styles,
  create: (factory: StyleFactory) =>
    new Proxy(
      {},
      {
        get: (_target, key: string) => {
          if (key === 'useVariants') return () => undefined;
          const resolved = typeof factory === 'function' ? factory(currentTheme, miniRuntime) : factory;
          return resolved[key];
        },
      },
    ),
};

export const UnistylesRuntime = {
  ...miniRuntime,
  setTheme: jest.fn(),
  updateTheme: jest.fn(),
  setAdaptiveThemes: jest.fn(),
  setRootViewBackgroundColor: jest.fn(),
  getTheme: () => currentTheme,
};

export const useUnistyles = () => ({ theme: currentTheme, rt: miniRuntime });

export function withUnistyles<P extends object>(
  Component: ComponentType<P>,
  mapper?: (theme: Theme, rt: typeof miniRuntime) => Partial<P>,
) {
  return function WithUnistyles(props: P) {
    return createElement(Component, { ...mapper?.(currentTheme, miniRuntime), ...props });
  };
}
