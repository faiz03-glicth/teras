import type { ColorScheme, Elevation } from '../types';

/** Box-shadow strings for the New Architecture `boxShadow` style. Dark cards rely on borders instead (null). */
export const elevation: Record<ColorScheme, Elevation> = {
  light: {
    card: '0px 1px 2px rgba(13,23,18,0.05), 0px 6px 20px rgba(13,23,18,0.05)',
    raised: '0px 10px 30px rgba(0,0,0,0.2)',
  },
  dark: {
    card: null,
    raised: '0px 10px 30px rgba(0,0,0,0.45)',
  },
};
