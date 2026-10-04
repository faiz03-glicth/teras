export type WeightUnit = 'kg' | 'lb';
export type StepDirection = 1 | -1;

export const LB_PER_KG = 2.20462;
export const CM_PER_INCH = 2.54;

/**
 * The two measurement systems, keyed by their weight unit (the stored preference). `weight` and `height`
 * name the units the system shows; `detail` is both, for the unit choice.
 */
export const UNIT_SYSTEMS = {
  kg: { label: 'Metric', detail: 'kg · cm', weight: 'kg', height: 'cm' },
  lb: { label: 'Imperial', detail: 'lb · ft in', weight: 'lb', height: 'ft in' },
} as const satisfies Record<WeightUnit, { label: string; detail: string; weight: string; height: string }>;

/** Bodyweight is stored in kilograms whatever the display unit, so switching units never changes it. */
export const BODYWEIGHT_KG = { min: 30, max: 250, default: 70 } as const;
/** Height is stored in centimetres whatever the display unit. */
export const HEIGHT_CM = { min: 120, max: 220, default: 170 } as const;
export const REST_SECONDS = { min: 15, max: 300, step: 5, default: 90 } as const;

/** One tap of the bodyweight stepper, in the unit shown: 0.1 kg, or 0.1 lb. */
const WEIGHT_TICKS_PER_UNIT = 10;
/** One tap of the height stepper: 1 cm, or 1 inch. */
const HEIGHT_TICKS_PER_CM = { kg: 1, lb: 1 / CM_PER_INCH } as const satisfies Record<WeightUnit, number>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * PURE: one tap of a stepper whose value is stored in one unit but shown in another. It counts in whole
 * ticks of the shown unit, so tapping + then − always comes back to where it started, and a stored value
 * between ticks (after a change of units) lands on a tick first.
 */
function stepStored(
  stored: number,
  direction: StepDirection,
  ticksPerStored: number,
  { min, max }: { min: number; max: number },
): number {
  // Divided, not multiplied: 701 / 10 is exactly 70.1, where 701 × 0.1 is not.
  const moved = (Math.round(stored * ticksPerStored) + direction) / ticksPerStored;
  return clamp(moved, min, max);
}

/** PURE: one tap of the bodyweight stepper: 0.1 kg, or 0.1 lb when pounds are shown. */
export function stepBodyweightKg(kg: number, direction: StepDirection, unit: WeightUnit): number {
  const perKg = WEIGHT_TICKS_PER_UNIT * (unit === 'kg' ? 1 : LB_PER_KG);
  return stepStored(kg, direction, perKg, BODYWEIGHT_KG);
}

/** PURE: one tap of the height stepper: 1 cm, or 1 inch when feet and inches are shown. */
export function stepHeightCm(cm: number, direction: StepDirection, unit: WeightUnit): number {
  return stepStored(cm, direction, HEIGHT_TICKS_PER_CM[unit], HEIGHT_CM);
}

/** PURE: one tap of the rest stepper: 5 seconds, between 15 seconds and 5 minutes. */
export function stepRestSeconds(seconds: number, direction: StepDirection): number {
  return clamp(seconds + direction * REST_SECONDS.step, REST_SECONDS.min, REST_SECONDS.max);
}

/** PURE: a weight in the unit shown, without the unit: "70", "70.5", "154.3". Rounds only for display. */
export function weightNumber(kg: number, unit: WeightUnit): string {
  const shown = unit === 'kg' ? kg : kg * LB_PER_KG;
  return String(Math.round(shown * WEIGHT_TICKS_PER_UNIT) / WEIGHT_TICKS_PER_UNIT);
}

/** PURE: "70 kg", "70.5 kg" or "154.3 lb". Rounds only for display. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${weightNumber(kg, unit)} ${unit}`;
}

/**
 * PURE: training volume as "4,820 kg" or "10,626 lb": whole units, thousands grouped. Grouped by hand
 * rather than by the locale, so the number reads the same on every phone.
 */
export function formatVolume(kg: number, unit: WeightUnit): string {
  const shown = Math.round(unit === 'kg' ? kg : kg * LB_PER_KG);
  return `${String(shown).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${unit}`;
}

/** PURE: "170 cm" or "5 ft 7 in". Rounds only for display. */
export function formatHeight(cm: number, unit: WeightUnit): string {
  if (unit === 'kg') return `${Math.round(cm)} cm`;
  const total = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(total / 12)} ft ${total % 12} in`;
}

/** PURE: "45 s", "1 min" or "1 min 30 s". */
export function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/**
 * One number of a value being typed, laid out the way the value reads: "5 ft 7 in" is two fields, "5"
 * then "7", each followed by its unit. `maxLength` is the most digits that number ever needs.
 */
export interface ValueField {
  text: string;
  suffix: string;
  maxLength: number;
}

/** PURE: bodyweight as one field in the unit shown: "70" kg, or "154.3" lb. */
export function bodyweightFields(kg: number, unit: WeightUnit): ValueField[] {
  const shown = unit === 'kg' ? kg : kg * LB_PER_KG;
  const text = String(Math.round(shown * WEIGHT_TICKS_PER_UNIT) / WEIGHT_TICKS_PER_UNIT);
  return [{ text, suffix: unit, maxLength: 5 }];
}

/** PURE: height as "170" cm, or as two fields, "5" ft and "7" in. */
export function heightFields(cm: number, unit: WeightUnit): ValueField[] {
  if (unit === 'kg') return [{ text: String(Math.round(cm)), suffix: 'cm', maxLength: 3 }];
  const total = Math.round(cm / CM_PER_INCH);
  return [
    { text: String(Math.floor(total / 12)), suffix: 'ft', maxLength: 1 },
    { text: String(total % 12), suffix: 'in', maxLength: 2 },
  ];
}

/** PURE: rest as two fields, "1" min and "30" s; seconds take three digits, so "90" s can be typed whole. */
export function restFields(seconds: number): ValueField[] {
  return [
    { text: String(Math.floor(seconds / 60)), suffix: 'min', maxLength: 1 },
    { text: String(seconds % 60), suffix: 's', maxLength: 3 },
  ];
}

/** A typed number: blank is `undefined`, anything that is not a plain decimal is `null`. A comma is a point. */
function readNumber(text: string): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') return null;
  return Number(trimmed);
}

/**
 * Several typed numbers as one: each times its weight, a blank part counting as zero. Nothing when every
 * part is blank or any part is not a number, so a slip leaves the value as it was.
 */
function readParts(parts: readonly string[], weights: readonly number[]): number | null {
  const numbers = parts.map(readNumber);
  if (numbers.includes(null) || numbers.every((n) => n === undefined)) return null;
  return numbers.reduce<number>((sum, n, i) => sum + (n ?? 0) * (weights[i] ?? 0), 0);
}

/** PURE: typed bodyweight, in the unit shown, to kilograms: kept to a tenth of that unit and in range. */
export function parseBodyweightKg(text: string, unit: WeightUnit): number | null {
  const shown = readParts([text], [1]);
  if (shown === null) return null;
  const tenths = Math.round(shown * WEIGHT_TICKS_PER_UNIT) / WEIGHT_TICKS_PER_UNIT;
  return clamp(unit === 'kg' ? tenths : tenths / LB_PER_KG, BODYWEIGHT_KG.min, BODYWEIGHT_KG.max);
}

/** PURE: typed height, ["182"] cm or ["5", "11"] ft and in, to centimetres in range. */
export function parseHeightCm(parts: readonly string[], unit: WeightUnit): number | null {
  if (unit === 'kg') {
    const cm = readParts(parts.slice(0, 1), [1]);
    return cm === null ? null : clamp(Math.round(cm), HEIGHT_CM.min, HEIGHT_CM.max);
  }
  const inches = readParts(parts.slice(0, 2), [12, 1]);
  return inches === null ? null : clamp(Math.round(inches) * CM_PER_INCH, HEIGHT_CM.min, HEIGHT_CM.max);
}

/** PURE: typed rest, ["1", "30"] min and s, to whole seconds in range. */
export function parseRestSeconds(parts: readonly string[]): number | null {
  const seconds = readParts(parts.slice(0, 2), [60, 1]);
  return seconds === null ? null : clamp(Math.round(seconds), REST_SECONDS.min, REST_SECONDS.max);
}
