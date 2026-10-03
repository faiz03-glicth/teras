import type { Muscle } from '@/core/db/schema';

/**
 * The regions of the body drawing each muscle covers, as the prototype maps them. The drawing has no
 * separate lats or abductor regions, so lats share the lower back's and the hip muscles share one.
 */
const MUSCLE_REGIONS: Record<Muscle, readonly string[]> = {
  chest: ['pectorals'],
  lats: ['lowerback'],
  upper_back: ['trapezoidback'],
  lower_back: ['lowerback'],
  shoulders: ['deltoids', 'reardelts'],
  traps: ['trapezoid', 'trapezoidback'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['flexors'],
  abs: ['abdomen'],
  quads: ['quadriceps'],
  hamstrings: ['hamstrings'],
  glutes: ['gluteus'],
  calves: ['gastrocnemius', 'lowerleg', 'tibialis'],
  adductors: ['abductors'],
  abductors: ['abductors'],
};

/** The muscle a tap on each region picks (the prototype's choice where a region is shared). */
const REGION_MUSCLE = new Map<string, Muscle>([
  ['pectorals', 'chest'],
  ['abdomen', 'abs'],
  ['trapezoid', 'traps'],
  ['quadriceps', 'quads'],
  ['tibialis', 'calves'],
  ['gastrocnemius', 'calves'],
  ['abductors', 'adductors'],
  ['biceps', 'biceps'],
  ['deltoids', 'shoulders'],
  ['flexors', 'forearms'],
  ['reardelts', 'shoulders'],
  ['triceps', 'triceps'],
  ['lowerleg', 'calves'],
  ['hamstrings', 'hamstrings'],
  ['gluteus', 'glutes'],
  ['lowerback', 'lats'],
  ['trapezoidback', 'upper_back'],
]);

export type RegionShade = 'primary' | 'secondary' | 'none';

export interface Highlight {
  primary: readonly Muscle[];
  secondary: readonly Muscle[];
}

/** PURE: how strongly a region of the drawing is shaded for the muscles highlighted. */
export function regionShade(region: string, { primary, secondary }: Highlight): RegionShade {
  const covers = (muscles: readonly Muscle[]) =>
    muscles.some((muscle) => MUSCLE_REGIONS[muscle].includes(region));
  if (covers(primary)) return 'primary';
  return covers(secondary) ? 'secondary' : 'none';
}

/** PURE: the muscle a tapped region stands for, or null for a region that is not one. */
export function muscleOfRegion(region: string): Muscle | null {
  return REGION_MUSCLE.get(region) ?? null;
}
