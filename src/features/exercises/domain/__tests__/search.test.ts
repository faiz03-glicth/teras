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

// Real ids, so each takes its place in the curated library's order: bench 0, row 18, press 29, curl 46.
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
const DUMBBELL_PRESS = exercise({
  id: 'shoulder-press-dumbbell',
  name: 'Shoulder Press (Dumbbell)',
  equipment: 'dumbbell',
  primaryMuscle: 'shoulders',
});

const ALL = [BENCH, OHP, CURL, ROW];
const ids = (rows: readonly ExerciseRow[]) => rows.map((row) => row.id);

describe('searchExercises', () => {
  it('lists everything in library order when the query is blank', () => {
    expect(ids(searchExercises(ALL, '   '))).toEqual([
      'bench-press-barbell',
      'bent-over-row-barbell',
      'overhead-press-barbell',
      'bicep-curl-dumbbell',
    ]);
  });

  it("puts a person's own exercises after the built-ins and one no longer in the library last", () => {
    const mine = exercise({ id: 'mine', name: 'Landmine Press', isCustom: true });
    const familiar = exercise({ id: 'squat-dumbbell', name: 'Squat (Dumbbell)', equipment: 'dumbbell' });
    // Dropped when the library was curated, but kept because a workout uses it.
    const retired = exercise({
      id: 'plyo-squat-dumbbell',
      name: 'Plyo Squat (Dumbbell)',
      equipment: 'dumbbell',
    });

    expect(ids(searchExercises([retired, familiar, mine, OHP], ''))).toEqual([
      'overhead-press-barbell',
      'mine',
      'squat-dumbbell',
      'plyo-squat-dumbbell',
    ]);
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

  it('requires every word naming the movement to match', () => {
    expect(ids(searchExercises(ALL, 'press barbell'))).toEqual([
      'bench-press-barbell',
      'overhead-press-barbell',
    ]);
    expect(searchExercises(ALL, 'press curl')).toEqual([]);
  });

  it('puts the equipment asked for first, without hiding the rest', () => {
    expect(ids(searchExercises([...ALL, DUMBBELL_PRESS], 'dumbbell press'))).toEqual([
      'shoulder-press-dumbbell',
      'bench-press-barbell',
      'overhead-press-barbell',
    ]);
    // No dumbbell press here: the presses there are still listed.
    expect(ids(searchExercises(ALL, 'press dumbbell'))).toEqual([
      'bench-press-barbell',
      'overhead-press-barbell',
    ]);
  });

  it('puts the exercise asked for before those it is only part of', () => {
    const squat = exercise({ id: 'squat-dumbbell', name: 'Squat (Dumbbell)', equipment: 'dumbbell' });
    const front = exercise({ id: 'front-squat-barbell', name: 'Front Squat (Barbell)' });

    // The front squat leads the library's order, but "squat" is the dumbbell squat's whole name.
    expect(ids(searchExercises([front, squat], 'squat'))).toEqual(['squat-dumbbell', 'front-squat-barbell']);
  });

  it('puts the query as a phrase before its words found apart or in a secondary muscle', () => {
    const bench = exercise({ ...BENCH, secondaryMuscles: ['triceps', 'shoulders'] });

    // The bench press leads the library, but only works the shoulders on the side.
    expect(ids(searchExercises([bench, DUMBBELL_PRESS], 'shoulder press'))).toEqual([
      'shoulder-press-dumbbell',
      'bench-press-barbell',
    ]);
  });

  it('puts whole words before the start of a longer one', () => {
    const pushdown = exercise({
      id: 'triceps-pushdown-cable',
      name: 'Triceps Pushdown (Cable)',
      equipment: 'cable',
      primaryMuscle: 'triceps',
    });
    const legPress = exercise({ id: 'leg-press-machine', name: 'Leg Press (Machine)', equipment: 'machine' });

    // The pushdown is also called a "pressdown", so "press" finds it, after every press.
    expect(ids(searchExercises([pushdown, legPress, BENCH], 'press'))).toEqual([
      'bench-press-barbell',
      'leg-press-machine',
      'triceps-pushdown-cable',
    ]);
  });

  it('finds an exercise by the other names for its movement', () => {
    expect(ids(searchExercises(ALL, 'military press'))).toEqual(['overhead-press-barbell']);
    expect(ids(searchExercises(ALL, 'shoulder press'))).toEqual(['overhead-press-barbell']);
  });

  it('reads a word still being typed as typed', () => {
    const preacher = exercise({
      id: 'preacher-curl-machine',
      name: 'Preacher Curl (Machine)',
      equipment: 'machine',
      primaryMuscle: 'biceps',
    });

    // "pres" is "press" half typed, not the plural of "pre".
    expect(ids(searchExercises([preacher, BENCH], 'pres'))).toEqual(['bench-press-barbell']);
  });

  it('reads a single letter typed past as a whole word', () => {
    const tBar = exercise({
      id: 't-bar-row-barbell',
      name: 'T Bar Row (Barbell)',
      primaryMuscle: 'upper_back',
    });

    // The T of "t bar" is not the start of "Triceps".
    expect(ids(searchExercises([...ALL, tBar], 't bar'))).toEqual(['t-bar-row-barbell']);
  });

  it('reads plurals as the word', () => {
    const calf = exercise({
      id: 'standing-calf-raise-machine',
      name: 'Standing Calf Raise (Machine)',
      equipment: 'machine',
      primaryMuscle: 'calves',
    });
    const chinUp = exercise({
      id: 'chin-up',
      name: 'Chin Up',
      equipment: 'bodyweight',
      primaryMuscle: 'lats',
    });

    expect(ids(searchExercises([calf, ...ALL], 'calves'))).toEqual(['standing-calf-raise-machine']);
    expect(ids(searchExercises([chinUp, ...ALL], 'chin ups'))).toEqual(['chin-up']);
    expect(ids(searchExercises(ALL, 'presses'))).toEqual(['bench-press-barbell', 'overhead-press-barbell']);
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
