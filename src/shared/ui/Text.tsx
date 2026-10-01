import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Theme, TypographyVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'onAccent';
type Weight = keyof Theme['fonts'];

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  weight?: Exclude<Weight, 'googleLabel'>;
}

export function Text({ variant = 'body', tone = 'primary', align, weight, style, ...rest }: TextProps) {
  return <RNText style={[styles.text(variant, tone, align, weight), style]} {...rest} />;
}

const toneColor = (theme: Theme, tone: TextTone): string =>
  ({
    primary: theme.colors.text,
    secondary: theme.colors.text2,
    tertiary: theme.colors.text3,
    accent: theme.colors.accentText,
    danger: theme.colors.danger,
    onAccent: theme.colors.onAccent,
  })[tone];

const styles = StyleSheet.create((theme) => ({
  text: (
    variant: TypographyVariant,
    tone: TextTone,
    align?: TextProps['align'],
    weight?: TextProps['weight'],
  ) => ({
    ...theme.typography[variant],
    ...(weight ? { fontFamily: theme.fonts[weight] } : null),
    color: toneColor(theme, tone),
    textAlign: align,
  }),
}));
