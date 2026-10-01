import type { ActivityColorKey, ColorScheme } from '../types';
import { BRAND_GOLD } from './brand';

export const activityColors: Record<ColorScheme, Record<ActivityColorKey, string>> = {
  light: {
    green: BRAND_GOLD,
    // Deepened from #E8770F so the icon clears the 3:1 non-text minimum on light cards.
    orange: '#D66A0B',
    purple: '#8B4FD8',
    blue: '#2F74D0',
    pink: '#D2457F',
    teal: '#12908E',
  },
  dark: {
    green: '#3DD68C',
    orange: '#FF9F43',
    purple: '#B685FF',
    blue: '#6AA8FF',
    pink: '#FF7FB0',
    teal: '#4FD6CF',
  },
};
