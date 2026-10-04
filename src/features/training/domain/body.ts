import type { StepDirection } from './preferences';

/** Body fat, for FFMI only: a whole percentage from 3 % to 50 %, asked for when FFMI is opened. */
export const BODY_FAT_PERCENT = { min: 3, max: 50, default: 18 } as const;

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export const BMI_CATEGORY_LABELS = {
  underweight: 'Underweight',
  normal: 'Normal weight',
  overweight: 'Overweight',
  obese: 'Obese',
} as const satisfies Record<BmiCategory, string>;

/** The scale Profile draws: BMI 15 to 35, in the four adult bands, each from its lower edge. */
const BMI_SCALE = { min: 15, max: 35 } as const;

export const BMI_BANDS = [
  { category: 'underweight', from: BMI_SCALE.min, to: 18.5 },
  { category: 'normal', from: 18.5, to: 25 },
  { category: 'overweight', from: 25, to: 30 },
  { category: 'obese', from: 30, to: BMI_SCALE.max },
] as const satisfies readonly { category: BmiCategory; from: number; to: number }[];

export type BmiBand = (typeof BMI_BANDS)[number];

const SCALE_SPAN = BMI_SCALE.max - BMI_SCALE.min;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** PURE: how much of the scale a band takes, from 0 to 1. */
export const bandShare = (band: BmiBand): number => (band.to - band.from) / SCALE_SPAN;

/** PURE: how far along the scale a band starts, from 0 to 1. */
export const bandStart = (band: BmiBand): number => (band.from - BMI_SCALE.min) / SCALE_SPAN;

export interface Bmi {
  value: number;
  category: BmiCategory;
  /** Where it sits on the scale drawn, from 0 (BMI 15 or less) to 1 (35 or more). */
  position: number;
}

/** PURE: body mass index, kilograms over metres squared, with its band and its place on the scale. */
export function bmiOf(weightKg: number, heightCm: number): Bmi {
  const metres = heightCm / 100;
  const value = weightKg / (metres * metres);
  const category = value < 18.5 ? 'underweight' : value < 25 ? 'normal' : value < 30 ? 'overweight' : 'obese';
  return { value, category, position: clamp((value - BMI_SCALE.min) / SCALE_SPAN, 0, 1) };
}

export interface Ffmi {
  value: number;
  leanKg: number;
}

/**
 * PURE: fat-free mass index, normalised to a height of 1.8 m (lean kg / m² + 6.1 × (1.8 − m)), so that
 * people of different heights compare. Only as good as the body-fat figure it is given.
 */
export function ffmiOf(weightKg: number, heightCm: number, bodyFatPercent: number): Ffmi {
  const metres = heightCm / 100;
  const leanKg = weightKg * (1 - bodyFatPercent / 100);
  return { value: leanKg / (metres * metres) + 6.1 * (1.8 - metres), leanKg };
}

/** PURE: one tap of the body-fat stepper: one percent, within range. */
export function stepBodyFatPercent(percent: number, direction: StepDirection): number {
  return clamp(Math.round(percent) + direction, BODY_FAT_PERCENT.min, BODY_FAT_PERCENT.max);
}

/** PURE: a BMI or FFMI as it is shown: "24.2", "20.0". */
export const formatIndex = (value: number): string => value.toFixed(1);
