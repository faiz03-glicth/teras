import type { ExerciseType } from '@/core/db/schema';
import { LB_PER_KG, type WeightUnit } from '@/features/training/domain/preferences';
import { formatDuration } from '@/shared/lib/format/formatDuration';

/** A set's weight is shown to a tenth of the unit; anything finer is noise from converting. */
const TENTHS = 10;

/**
 * PURE: a stored weight as a set field shows it, in the unit chosen: 60 → "60", 61.235 kg → "135" lb.
 * Blank for a weight not recorded yet.
 */
export function setWeightText(kg: number | null, unit: WeightUnit): string {
  if (kg === null) return '';
  const shown = unit === 'kg' ? kg : kg * LB_PER_KG;
  return String(Math.round(shown * TENTHS) / TENTHS);
}

/**
 * PURE: a typed weight back to kilograms, the unit every set is stored in (unrounded, so a pound weight
 * shows back exactly as it was typed). A blank or a non-number is "not recorded", never zero.
 */
export function parseSetWeight(text: string, unit: WeightUnit): number | null {
  const typed = Number.parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(typed)) return null;
  return unit === 'kg' ? typed : typed / LB_PER_KG;
}

/** PURE: the weight column's heading: "kg", or "+kg" — weight added to the body — for a bodyweight exercise. */
export function weightColumn(type: ExerciseType, unit: WeightUnit): string {
  return type === 'bodyweight' ? `+${unit}` : unit;
}

/** A completed set from the last time an exercise was done: what the Previous column shows. */
export interface PreviousSet {
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/**
 * PURE: last time's set as the Previous column reads it, short enough for the table: "60kg × 8",
 * "+10kg × 8" or "× 12" for bodyweight, "1:15" for a hold. A dash where there was no set.
 */
export function previousText(set: PreviousSet | undefined, type: ExerciseType, unit: WeightUnit): string {
  if (!set) return '—';
  if (type === 'timed') return formatDuration(set.seconds ?? 0);
  const reps = `× ${set.reps ?? 0}`;
  const weight = set.weightKg ?? 0;
  if (type === 'bodyweight') return weight > 0 ? `+${setWeightText(weight, unit)}${unit} ${reps}` : reps;
  return `${setWeightText(weight, unit)}${unit} ${reps}`;
}
