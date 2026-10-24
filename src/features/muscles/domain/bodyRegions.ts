import type { MuscleGroup } from './muscleGroups';

/**
 * Which of the ten muscle groups each region of the body drawing (exercises' bodyMapPaths) counts towards,
 * so this week's map can shade a region by its group's tier. The inner thigh (the front's `abductors`
 * region) goes with Quads, as the adductors do; the shoulders' rear delts with Shoulders; the forearms'
 * flexors with Biceps. A test keeps this in step with the drawing.
 */
export const GROUP_OF_REGION: Readonly<Record<string, MuscleGroup>> = {
  // Front
  abdomen: 'core',
  trapezoid: 'back',
  pectorals: 'chest',
  quadriceps: 'quads',
  tibialis: 'calves',
  gastrocnemius: 'calves',
  abductors: 'quads',
  biceps: 'biceps',
  deltoids: 'shoulders',
  flexors: 'biceps',
  // Back
  triceps: 'triceps',
  reardelts: 'shoulders',
  lowerleg: 'calves',
  hamstrings: 'hamstrings',
  gluteus: 'glutes',
  lowerback: 'back',
  trapezoidback: 'back',
};
