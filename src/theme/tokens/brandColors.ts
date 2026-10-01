import type { BrandColors, ColorScheme } from '../types';

/**
 * Third-party sign-in button colours, fixed by each provider's branding guidelines
 * (Apple HIG: black in light / white in dark; Google Identity: neutral light/dark themes).
 */
export const brandColors: Record<ColorScheme, BrandColors> = {
  light: {
    apple: { background: '#000000', foreground: '#FFFFFF' },
    google: { background: '#FFFFFF', foreground: '#1F1F1F', border: '#747775' },
  },
  dark: {
    apple: { background: '#FFFFFF', foreground: '#000000' },
    google: { background: '#131314', foreground: '#E3E3E3', border: '#8E918F' },
  },
};
