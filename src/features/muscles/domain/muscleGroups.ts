import type { Muscle } from '@/core/db/schema';

/**
 * The ten muscles the muscle cards show (this week's map, balance, history), in the mockup's order. The
 * app's sixteen muscle ids fold into them so a chart stays readable.
 */
export const MUSCLE_GROUPS = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'calves',
  'hamstrings',
  'glutes',
  'back',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  quads: 'Quads',
  calves: 'Calves',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  back: 'Back',
};

/**
 * Which group each muscle id counts towards (mockup, MuscleWeek and MuscleBalance boards): lats, upper and
 * lower back and traps are Back; abductors go with Glutes, adductors with Quads; forearms with Biceps.
 */
export const GROUP_OF_MUSCLE: Record<Muscle, MuscleGroup> = {
  chest: 'chest',
  lats: 'back',
  upper_back: 'back',
  lower_back: 'back',
  shoulders: 'shoulders',
  traps: 'back',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'biceps',
  abs: 'core',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  adductors: 'quads',
  abductors: 'glutes',
};

/** PURE: every group at zero, ready to add to. */
export function emptyGroups(): Record<MuscleGroup, number> {
  return Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0])) as Record<MuscleGroup, number>;
}
