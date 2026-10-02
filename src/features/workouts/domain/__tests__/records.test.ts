import type { SetType } from '@/core/db/schema';

import { newRecords, recordLine, setBests, type RecordSet } from '../records';

const done = (
  values: Partial<Pick<RecordSet, 'weightKg' | 'reps' | 'seconds'>>,
  setType: SetType = 'normal',
): RecordSet => ({ status: 'done', setType, weightKg: null, reps: null, seconds: null, ...values });

const pending = (values: Partial<Pick<RecordSet, 'weightKg' | 'reps' | 'seconds'>>): RecordSet => ({
  ...done(values),
  status: 'pending',
});

const bench = (sets: RecordSet[]) => ({
  exerciseId: 'bench',
  name: 'Bench Press (Barbell)',
  type: 'weighted' as const,
  sets,
});

describe('setBests', () => {
  it('takes the best of each measure across the completed sets', () => {
    expect(setBests([done({ weightKg: 60, reps: 8 }), done({ weightKg: 70, reps: 3 })])).toEqual({
      weightKg: 70,
      reps: 8,
      seconds: null,
    });
  });

  it('leaves out warm-ups and unticked sets', () => {
    expect(
      setBests([
        done({ weightKg: 60, reps: 8 }),
        done({ weightKg: 100, reps: 5 }, 'warmup'),
        pending({ weightKg: 120, reps: 1 }),
      ]),
    ).toEqual({ weightKg: 60, reps: 8, seconds: null });
  });

  it('counts a weight only when it was lifted at least once', () => {
    expect(
      setBests([done({ weightKg: 140, reps: 0 }), done({ weightKg: 60, reps: null })]).weightKg,
    ).toBeNull();
  });
});

describe('newRecords', () => {
  it('counts the first time an exercise is done as a record', () => {
    expect(newRecords([bench([done({ weightKg: 60, reps: 8 })])], {})).toEqual([
      { exerciseId: 'bench', name: 'Bench Press (Barbell)', type: 'weighted', value: 60 },
    ]);
  });

  it('is a record only when it beats every earlier session', () => {
    const earlier = { bench: { weightKg: 60, reps: 10, seconds: null } };

    expect(newRecords([bench([done({ weightKg: 60, reps: 12 })])], earlier)).toEqual([]);
    expect(newRecords([bench([done({ weightKg: 62.5, reps: 5 })])], earlier)).toMatchObject([
      { value: 62.5 },
    ]);
  });

  it('measures a bodyweight exercise by its reps, and a timed one by its hold', () => {
    const records = newRecords(
      [
        {
          exerciseId: 'pull-up',
          name: 'Pull Up',
          type: 'bodyweight',
          sets: [done({ weightKg: 10, reps: 12 })],
        },
        { exerciseId: 'plank', name: 'Plank', type: 'timed', sets: [done({ seconds: 75 })] },
      ],
      {
        'pull-up': { weightKg: 20, reps: 10, seconds: null },
        plank: { weightKg: null, reps: null, seconds: 60 },
      },
    );

    expect(records).toEqual([
      { exerciseId: 'pull-up', name: 'Pull Up', type: 'bodyweight', value: 12 },
      { exerciseId: 'plank', name: 'Plank', type: 'timed', value: 75 },
    ]);
  });

  it('is nothing for an exercise with no completed set', () => {
    expect(newRecords([bench([pending({ weightKg: 60, reps: 8 })])], {})).toEqual([]);
  });

  it('judges an exercise done twice in one workout once, on all its sets', () => {
    const records = newRecords(
      [bench([done({ weightKg: 60, reps: 8 })]), bench([done({ weightKg: 65, reps: 5 })])],
      {},
    );

    expect(records).toEqual([expect.objectContaining({ exerciseId: 'bench', value: 65 })]);
  });
});

describe('recordLine', () => {
  const record = (type: 'weighted' | 'bodyweight' | 'timed', value: number) => ({
    exerciseId: 'x',
    name: 'X',
    type,
    value,
  });

  it('says what the record is, and what it is measured by', () => {
    expect(recordLine(record('weighted', 102.5), 'kg')).toBe('102.5 kg · heaviest weight');
    expect(recordLine(record('bodyweight', 12), 'kg')).toBe('12 reps · most reps');
    expect(recordLine(record('timed', 75), 'kg')).toBe('1 min 15 s · longest hold');
  });

  it('shows a weight in the unit chosen', () => {
    expect(recordLine(record('weighted', 100), 'lb')).toBe('220.5 lb · heaviest weight');
  });
});
