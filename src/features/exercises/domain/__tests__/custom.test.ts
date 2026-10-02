import { exerciseRow } from '@test/fakes/exerciseRows';

import { checkNewExercise, typeForEquipment } from '../custom';

const LIBRARY = [exerciseRow('bench-press-barbell', 'Bench Press (Barbell)')];

describe('checkNewExercise', () => {
  it('accepts a new name, tidied of extra spaces', () => {
    expect(checkNewExercise(LIBRARY, '  Landmine   Press ')).toEqual({ ok: true, name: 'Landmine Press' });
  });

  it('asks for a name when there is none', () => {
    expect(checkNewExercise(LIBRARY, '   ')).toEqual({ ok: false, reason: 'Give the exercise a name' });
  });

  it('refuses a name already in the library, whatever its case', () => {
    expect(checkNewExercise(LIBRARY, 'bench press (barbell)')).toEqual({
      ok: false,
      reason: 'Bench Press (Barbell) is already in your exercises',
    });
  });
});

describe('typeForEquipment', () => {
  it('measures a bodyweight exercise in reps, and anything with equipment in weight × reps', () => {
    expect(typeForEquipment('bodyweight')).toBe('bodyweight');
    expect(typeForEquipment('kettlebell')).toBe('weighted');
  });
});
