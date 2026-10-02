import type { Equipment, ExerciseRow, ExerciseType } from '@/core/db/schema';

export type NewExerciseCheck = { ok: true; name: string } | { ok: false; reason: string };

/** A name as it is stored and compared: trimmed, with single spaces. */
const tidy = (name: string) => name.trim().replace(/\s+/g, ' ');

/**
 * PURE: whether a typed name can become a new exercise. It needs a name, and not one already in the
 * library (built-in or their own), whatever its case: two "Landmine Press" rows would split its history.
 */
export function checkNewExercise(library: readonly ExerciseRow[], typed: string): NewExerciseCheck {
  const name = tidy(typed);
  if (name === '') return { ok: false, reason: 'Give the exercise a name' };
  const taken = library.find((row) => tidy(row.name).toLowerCase() === name.toLowerCase());
  return taken ? { ok: false, reason: `${taken.name} is already in your exercises` } : { ok: true, name };
}

/** PURE: how a new exercise is measured: bodyweight in reps, anything with equipment in weight × reps. */
export function typeForEquipment(equipment: Equipment): ExerciseType {
  return equipment === 'bodyweight' ? 'bodyweight' : 'weighted';
}
