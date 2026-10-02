import type { ExerciseRow } from '@/core/db/schema';

import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './labels';

/**
 * Shorthand people type at the gym, expanded before matching. Each value is matched word by word, so
 * `ohp` only finds an exercise whose words cover both "overhead" and "press".
 */
const ALIASES: Record<string, string> = {
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  bb: 'barbell',
  db: 'dumbbell',
  kb: 'kettlebell',
  pullup: 'pull up',
  pullups: 'pull up',
  pushup: 'push up',
  pushups: 'push up',
  chinup: 'chin up',
  situp: 'sit up',
  skullcrusher: 'skull crusher',
  delt: 'shoulders',
  delts: 'shoulders',
  quad: 'quads',
  ham: 'hamstrings',
  hams: 'hamstrings',
  glute: 'glutes',
  calf: 'calves',
  abdominals: 'abs',
  core: 'abs',
};

const toWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

/** Every word an exercise can be found by: its name, its equipment and its muscles. */
function searchableWords(row: ExerciseRow): string[] {
  return toWords(
    [
      row.name,
      EQUIPMENT_LABELS[row.equipment],
      MUSCLE_LABELS[row.primaryMuscle],
      ...row.secondaryMuscles.map((muscle) => MUSCLE_LABELS[muscle]),
    ].join(' '),
  );
}

/** The query, lower-cased and split, with any shorthand expanded into the words it stands for. */
function queryTerms(query: string): string[] {
  return toWords(query).flatMap((word) => {
    const alias = ALIASES[word];
    return alias === undefined ? [word] : toWords(alias);
  });
}

/**
 * PURE: the exercises matching `query`, in the order they were given. A word matches when it starts a
 * word of the exercise's name, equipment or muscles — typing "bicep" finds "Biceps", but "ress" does not
 * find "Press". Every word of the query has to match something, so each one narrows the list. A blank
 * query matches everything.
 */
export function searchExercises(rows: readonly ExerciseRow[], query: string): ExerciseRow[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [...rows];
  return rows.filter((row) => {
    const words = searchableWords(row);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  });
}
