import type { ExerciseRow } from '@/core/db/schema';

/** An exercise as the library holds it: a built-in barbell chest lift unless told otherwise. */
export const exerciseRow = (id: string, name: string, over: Partial<ExerciseRow> = {}): ExerciseRow => ({
  id,
  userId: null,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
  deletedAt: null,
  dirty: false,
  name,
  equipment: 'barbell',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  type: 'weighted',
  isCompound: true,
  isCustom: false,
  ...over,
});

/** A small library: enough to tell sections, matches and similar exercises apart. */
export const LIBRARY: ExerciseRow[] = [
  exerciseRow('bench-press-barbell', 'Bench Press (Barbell)', { secondaryMuscles: ['triceps', 'shoulders'] }),
  exerciseRow('bicep-curl-dumbbell', 'Bicep Curl (Dumbbell)', {
    equipment: 'dumbbell',
    primaryMuscle: 'biceps',
    isCompound: false,
  }),
  exerciseRow('incline-bench-press-dumbbell', 'Incline Bench Press (Dumbbell)', { equipment: 'dumbbell' }),
  exerciseRow('plank', 'Plank', {
    equipment: 'bodyweight',
    primaryMuscle: 'abs',
    type: 'timed',
    isCompound: false,
  }),
  exerciseRow('squat-barbell', 'Squat (Barbell)', { primaryMuscle: 'quads', secondaryMuscles: ['glutes'] }),
];
