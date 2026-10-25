import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { ReactTestInstance } from 'react-test-renderer';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import type { ColorScheme, Theme } from '@/theme';

import { getTestTheme, setTestTheme } from './mocks/unistyles';

export const SCHEMES: readonly ColorScheme[] = ['light', 'dark'];

/** Renders with the Unistyles mock set to the given scheme; returns the theme used for assertions. */
export function renderInScheme(ui: ReactElement, scheme: ColorScheme = 'light', options?: RenderOptions) {
  setTestTheme(scheme);
  const theme: Theme = getTestTheme();
  return { ...render(ui, options), theme };
}

type Styled = { props: { style?: unknown } } | string | null | undefined;

/** The flattened style of a rendered node (or of the root of a toJSON() tree). */
export function styleOf(node: Styled | Styled[]): ViewStyle & TextStyle {
  const single = Array.isArray(node) ? node[0] : node;
  if (!single || typeof single === 'string') return {};
  return StyleSheet.flatten(single.props.style as StyleProp<ViewStyle & TextStyle>) ?? {};
}

type TreeNode = { children: (TreeNode | string)[] | null; props: { style?: unknown } };

/** Children of the root of a toJSON() tree. */
export function childrenOf(tree: TreeNode | TreeNode[] | null): (TreeNode | string)[] {
  const root = Array.isArray(tree) ? tree[0] : tree;
  return root?.children ?? [];
}

/**
 * The look a CachedSurface draws (the style of its inner view), checking how it is kept: a surface with a
 * box-shadow in a cached layer of its own, a surface with none (Black's, drawn with borders) as a plain view
 * with no layer. Either way it takes no touch and lies in a frame that is not collapsed away.
 */
export function cachedLookOf(surface: ReactTestInstance): ViewStyle & TextStyle {
  const look = styleOf(surface.props.children);
  expect(surface.props.renderToHardwareTextureAndroid).toBe(look.boxShadow !== undefined);
  expect(surface.props.collapsable).toBe(false);
  expect(surface.props.pointerEvents).toBe('none');
  return look;
}
