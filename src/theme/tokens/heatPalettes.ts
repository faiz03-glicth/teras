import type { ColorScheme, HeatPaletteId, HeatSteps } from '../types';

export const heatPalettes: Record<HeatPaletteId, Record<ColorScheme, HeatSteps>> = {
  meadow: {
    light: ['#EAEEE9', '#C3E8C9', '#7FD095', '#36AA62', '#146B3A'],
    dark: ['#1F2622', '#1A4A2F', '#1F7A45', '#34B267', '#6BE8A4'],
  },
  ocean: {
    light: ['#E8EEF2', '#C4DDF3', '#83B9E8', '#3B86D1', '#1B5596'],
    dark: ['#1D2329', '#17395A', '#1F5E99', '#3A8EE0', '#8CC4FF'],
  },
  violet: {
    light: ['#EDEBF2', '#DCD0F5', '#B89AEC', '#8B5AD8', '#5B2FA6'],
    dark: ['#221F29', '#34254F', '#553A8C', '#8A5EDB', '#C9A8FF'],
  },
  // Teras's own ramp: parchment to bronze in light, wood to gold in dark.
  amber: {
    light: ['#EBDBA6', '#FBE3A0', '#F2C14E', '#C98A1E', '#7A4A12'],
    dark: ['#2A2119', '#4A3719', '#8A6420', '#D19A3A', '#FFD179'],
  },
};

export const HEAT_PALETTE_IDS = Object.keys(heatPalettes) as HeatPaletteId[];
