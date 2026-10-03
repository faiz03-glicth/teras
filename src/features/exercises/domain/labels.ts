import type { Equipment, ExerciseRow, Muscle } from '@/core/db/schema';

/** What each muscle is called on screen. The schema stores the id; nothing shows the id. */
export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  lats: 'Lats',
  upper_back: 'Upper back',
  lower_back: 'Lower back',
  shoulders: 'Shoulders',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  adductors: 'Adductors',
  abductors: 'Abductors',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
};

/** "Chest · Triceps · Shoulders": the primary muscle first, then the rest. */
export function muscleSummary(row: Pick<ExerciseRow, 'primaryMuscle' | 'secondaryMuscles'>): string {
  return [row.primaryMuscle, ...row.secondaryMuscles].map((muscle) => MUSCLE_LABELS[muscle]).join(' · ');
}
