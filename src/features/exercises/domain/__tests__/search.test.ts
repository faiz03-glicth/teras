import type { ExerciseRow } from '@/core/db/schema';

import { searchExercises } from '../search';

const exercise = (over: Partial<ExerciseRow> & Pick<ExerciseRow, 'id' | 'name'>): ExerciseRow => ({
  userId: null,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
  deletedAt: null,
  dirty: false,
  equipment: 'barbell',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  type: 'weighted',
  isCompound: true,
  isCustom: false,
  ...over,
});

const BENCH = exercise({ id: 'bench-press-barbell', name: 'Bench Press (Barbell)' });
const OHP = exercise({
  id: 'overhead-press-barbell',
  name: 'Overhead Press (Barbell)',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['triceps'],
});
const CURL = exercise({
  id: 'bicep-curl-dumbbell',
  name: 'Bicep Curl (Dumbbell)',
  equipment: 'dumbbell',
  primaryMuscle: 'biceps',
  isCompound: false,
});
const ROW = exercise({
  id: 'bent-over-row-barbell',
  name: 'Bent Over Row (Barbell)',
  primaryMuscle: 'upper_back',
  secondaryMuscles: ['lats', 'biceps'],
});

const ALL = [BENCH, OHP, CURL, ROW];
const ids = (rows: readonly ExerciseRow[]) => rows.map((row) => row.id);

describe('searchExercises', () => {
  it('returns everything when the query is blank', () => {
    expect(ids(searchExercises(ALL, '   '))).toEqual(ids(ALL));
  });

  it('matches the start of a word in the name, not the middle', () => {
    expect(ids(searchExercises(ALL, 'ben'))).toEqual(['bench-press-barbell', 'bent-over-row-barbell']);
    // "ress" is inside "Press": a prefix search must not find it.
    expect(searchExercises(ALL, 'ress')).toEqual([]);
  });

  it('matches equipment and muscles, not just the name', () => {
    expect(ids(searchExercises(ALL, 'dumbbell'))).toEqual(['bicep-curl-dumbbell']);
    expect(ids(searchExercises(ALL, 'lats'))).toEqual(['bent-over-row-barbell']);
  });

  it('finds a two-word muscle by either word', () => {
    expect(ids(searchExercises(ALL, 'upper'))).toEqual(['bent-over-row-barbell']);
    expect(ids(searchExercises(ALL, 'back'))).toEqual(['bent-over-row-barbell']);
  });

  it('requires every word of the query to match', () => {
    expect(ids(searchExercises(ALL, 'press barbell'))).toEqual([
      'bench-press-barbell',
      'overhead-press-barbell',
    ]);
    expect(searchExercises(ALL, 'press dumbbell')).toEqual([]);
  });

  it('ignores case and punctuation', () => {
    expect(ids(searchExercises(ALL, '  BENCH-press  '))).toEqual(['bench-press-barbell']);
  });

  it('understands the gym shorthand people actually type', () => {
    expect(ids(searchExercises(ALL, 'ohp'))).toEqual(['overhead-press-barbell']);
    // "bicep" is a prefix of "biceps", so the row's secondary muscle counts too.
    expect(ids(searchExercises(ALL, 'bicep'))).toEqual(['bicep-curl-dumbbell', 'bent-over-row-barbell']);
  });
});
