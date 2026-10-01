import type { TextVariantStyle, Theme, TypographyVariant } from '../types';

/** Font family names as registered by expo-font (see core/bootstrap/fonts.ts). One family per weight. */
export const fonts: Theme['fonts'] = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  // Google's branding guidelines require Roboto Medium on the "Continue with Google" button.
  googleLabel: 'Roboto_500Medium',
};

const tabular: TextVariantStyle['fontVariant'] = ['tabular-nums'];

export const typography: Record<TypographyVariant, TextVariantStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.5 },
  title3: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.15 },
  /** Onboarding / login body copy: 16pt at 1.5 line height. */
  lead: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  mini: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  numeric: {
    fontFamily: fonts.semibold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    fontVariant: tabular,
  },
  numeric2: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontVariant: tabular,
  },
};
