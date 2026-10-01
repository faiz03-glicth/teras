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

/** PURE: "70 kg", "70.5 kg" or "154.3 lb". Rounds only for display. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const shown = unit === 'kg' ? kg : kg * LB_PER_KG;
  return `${Math.round(shown * WEIGHT_TICKS_PER_UNIT) / WEIGHT_TICKS_PER_UNIT} ${unit}`;
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
