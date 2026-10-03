const { describe, expect, it } = require('@jest/globals');

const { mapDataset, mapRecord, sameExerciseKey, teraName } = require('../map');

const record = (over) => ({
  id: '0001',
  name: 'barbell bench press',
  equipment: 'barbell',
  target: 'pectorals',
  secondary_muscles: ['triceps', 'shoulders'],
  ...over,
});

describe('mapping the exercise dataset onto Teras', () => {
  it('names and ids exercises the way the library does', () => {
    expect(teraName('barbell bench press', 'barbell')).toBe('Bench Press (Barbell)');
    expect(teraName('dumbbell incline bench press', 'dumbbell')).toBe('Incline Bench Press (Dumbbell)');
    expect(teraName('push-up', 'bodyweight')).toBe('Push Up');
    expect(teraName('cable curl (with rope)', 'cable')).toBe('Curl (With Rope) (Cable)');
    expect(teraName('lever chest press v. 2', 'machine')).toBe('Chest Press (Machine)');
    expect(mapRecord(record()).exercise.id).toBe('bench-press-barbell');
  });

  it('maps muscles and equipment to the canonical Teras set, dropping what Teras has no name for', () => {
    const { exercise } = mapRecord(
      record({
        equipment: 'smith machine',
        target: 'delts',
        secondary_muscles: ['rear deltoids', 'trapezius', 'hip flexors', 'core', 'core'],
      }),
    );

    expect(exercise).toMatchObject({
      equipment: 'machine',
      primaryMuscle: 'shoulders',
      secondaryMuscles: ['traps', 'abs'],
      type: 'weighted',
      isCompound: true,
    });
  });

  it('measures bodyweight moves by reps and holds by time', () => {
    const bodyweight = (name, equipment = 'body weight') =>
      mapRecord(record({ name, equipment, target: 'abs' })).exercise;

    expect(bodyweight('pull-up').type).toBe('bodyweight');
    expect(bodyweight('front plank').type).toBe('timed');
    expect(bodyweight('weighted pull-up', 'weighted')).toMatchObject({
      equipment: 'bodyweight',
      type: 'weighted',
    });
  });

  it('skips what Teras cannot log, saying why', () => {
    expect(mapRecord(record({ target: 'cardiovascular system' }))).toEqual({
      skip: 'target "cardiovascular system"',
    });
    expect(mapRecord(record({ equipment: 'stability ball' }))).toEqual({
      skip: 'equipment "stability ball"',
    });
    expect(mapRecord(record({ name: 'dumbbell press on stability ball', equipment: 'dumbbell' }))).toEqual({
      skip: 'ball named in the exercise',
    });
    expect(mapRecord(record({ name: '' }))).toEqual({ skip: 'no name' });
  });

  it('treats naming variations of one exercise as the same exercise', () => {
    const key = sameExerciseKey('Bench Press (Barbell)');

    expect(sameExerciseKey('Barbell Bench Press (Flat)')).toBe(key);
    expect(sameExerciseKey('Bench Press Barbell')).toBe(key);
    expect(sameExerciseKey('Push-ups')).toBe(sameExerciseKey('Push Up'));
    expect(sameExerciseKey('Incline Bench Press (Barbell)')).not.toBe(key);
  });

  it('keeps the library exercise and the first of each repeat, the same way every time', () => {
    const existing = [{ id: 'bench-press-barbell', name: 'Bench Press (Barbell)' }];
    const records = [
      record({ id: '0003', name: 'barbell bench press (male)' }),
      record({ id: '0002', name: 'dumbbell fly', equipment: 'dumbbell' }),
      record({ id: '0001', name: 'barbell bench press' }),
      record({ id: '0004', name: 'dumbbell fly v. 2', equipment: 'dumbbell' }),
      record({ id: '0005', name: 'run', equipment: 'body weight', target: 'cardiovascular system' }),
    ];

    const result = mapDataset(records, existing);

    expect(result.added.map((exercise) => exercise.id)).toEqual(['fly-dumbbell']);
    expect(result.duplicates).toBe(3);
    expect(result.skipped).toEqual({ 'target "cardiovascular system"': 1 });
    expect(mapDataset([...records].reverse(), existing)).toEqual(result);
  });
});
