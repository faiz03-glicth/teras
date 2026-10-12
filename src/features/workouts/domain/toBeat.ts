import type { ExerciseType } from '@/core/db/schema';
import { LB_PER_KG, weightNumber, type WeightUnit } from '@/features/training/domain/preferences';

import { beatTarget, WORKING_REPS, type BestSet } from './overload';

/** The next weight up: a 2.5 kg plate step, or 5 lb on a pound scale. */
export function weightStepKg(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5 / LB_PER_KG;
}

/** What a lift did last week and what beats it, worded for the routine preview and the workout. */
export interface ToBeatText {
  /** "80 kg × 8", "+10 kg × 6", "12 reps" or "60 s". */
  last: string;
  /** One more rep at the same weight (a longer hold, for a timed lift): "80 kg × 9". */
  target: string;
  /** The next weight up for the working reps: "82.5 kg × 5+". Null for a timed lift. */
  heavier: string | null;
}

/** "80 kg × 8"; for a bodyweight lift the weight added ("+10 kg × 6"), or just the reps with none added. */
function lift(type: ExerciseType, weightKg: number, reps: number, unit: WeightUnit, plus = ''): string {
  const repsText = `${reps}${plus}`;
  if (type === 'bodyweight') {
    return weightKg > 0 ? `+${weightNumber(weightKg, unit)} ${unit} × ${repsText}` : `${repsText} reps`;
  }
  return `${weightNumber(weightKg, unit)} ${unit} × ${repsText}`;
}

/** PURE: last week's best set of a lift, and the two ways to beat it, in the unit shown. */
export function toBeatText(type: ExerciseType, then: BestSet, unit: WeightUnit): ToBeatText {
  const beat = beatTarget(type, then, weightStepKg(unit));
  if (type === 'timed')
    return { last: `${then.seconds} s`, target: `${beat.longer ?? then.seconds} s`, heavier: null };
  const moreReps = beat.moreReps ?? { weightKg: then.weightKg, reps: then.reps + 1 };
  const heavier = beat.heavier ?? { weightKg: then.weightKg, reps: WORKING_REPS };
  return {
    last: lift(type, then.weightKg, then.reps, unit),
    target: lift(type, moreReps.weightKg, moreReps.reps, unit),
    heavier: lift(type, heavier.weightKg, heavier.reps, unit, '+'),
  };
}
