import { exerciseRow, setRow } from '@test/fakes/shareWorkout';

import { bestLifts, liftText, shareLifts, type LiftExercise } from '../lifts';

const options = { unit: 'kg', bodyweightKg: 70, records: new Set<string>() } as const;

const lifts = (exercises: LiftExercise[], over: Partial<typeof options> = {}) =>
  shareLifts(exercises, { ...options, ...over });

describe('liftText', () => {
  it('words a weighted set with its weight and reps', () => {
    expect(liftText(setRow('s', { weightKg: 82.5, reps: 6 }), 'weighted', 'kg')).toBe('82.5 kg × 6');
  });

  it('converts to pounds for the person who chose them', () => {
    expect(liftText(setRow('s', { weightKg: 100, reps: 5 }), 'weighted', 'lb')).toBe('220.5 lb × 5');
  });

  it('words weight added to the body with a plus', () => {
    expect(liftText(setRow('s', { weightKg: 10, reps: 8 }), 'bodyweight', 'kg')).toBe('+10 kg × 8');
  });

  it('words a bodyweight set with nothing added as its reps', () => {
    expect(liftText(setRow('s', { reps: 12 }), 'bodyweight', 'kg')).toBe('12 reps');
    expect(liftText(setRow('s', { reps: 1 }), 'bodyweight', 'kg')).toBe('1 rep');
  });

  it('words a weighted set with no weight recorded as its reps', () => {
    expect(liftText(setRow('s', { weightKg: null, reps: 8 }), 'weighted', 'kg')).toBe('8 reps');
  });

  it('words a hold as its length', () => {
    expect(liftText(setRow('s', { seconds: 75 }), 'timed', 'kg')).toBe('1 min 15 s');
    expect(liftText(setRow('s', { seconds: 45 }), 'timed', 'kg')).toBe('45 s');
  });
});

describe('shareLifts', () => {
  it('picks the heaviest set as the best, then the most reps at that weight', () => {
    const [bench] = lifts([
      exerciseRow('bench', 'Bench Press', 'weighted', [
        setRow('a', { weightKg: 60, reps: 10 }),
        setRow('b', { weightKg: 62.5, reps: 5 }),
        setRow('c', { weightKg: 62.5, reps: 7 }),
      ]),
    ]);

    expect(bench).toMatchObject({ name: 'Bench Press', sets: 3, best: '62.5 kg × 7' });
  });

  it('keeps the earlier of two identical best sets', () => {
    const [squat] = lifts([
      exerciseRow('squat', 'Squat', 'weighted', [
        setRow('a', { weightKg: 100, reps: 5 }),
        setRow('b', { weightKg: 100, reps: 5 }),
      ]),
    ]);

    expect(squat?.best).toBe('100 kg × 5');
  });

  it('ignores warm-ups and sets that were never ticked when choosing the best', () => {
    const [bench] = lifts([
      exerciseRow('bench', 'Bench Press', 'weighted', [
        setRow('a', { weightKg: 100, reps: 10, setType: 'warmup' }),
        setRow('b', { weightKg: 90, reps: 10, status: 'pending' }),
        setRow('c', { weightKg: 60, reps: 8 }),
      ]),
    ]);

    // The warm-up still counts as a completed set, as the workout's own totals count it.
    expect(bench).toMatchObject({ sets: 2, best: '60 kg × 8' });
  });

  it('judges a bodyweight exercise by its reps, then by the weight added', () => {
    const [pullUp] = lifts([
      exerciseRow('pull-up', 'Pull-up', 'bodyweight', [
        setRow('a', { reps: 12 }),
        setRow('b', { reps: 8, weightKg: 10 }),
        setRow('c', { reps: 12, weightKg: 5 }),
      ]),
    ]);

    expect(pullUp?.best).toBe('+5 kg × 12');
  });

  it('judges a timed exercise by its longest hold', () => {
    const [plank] = lifts([
      exerciseRow('plank', 'Plank', 'timed', [setRow('a', { seconds: 45 }), setRow('b', { seconds: 75 })]),
    ]);

    expect(plank).toMatchObject({ best: '1 min 15 s', rank: { loaded: false, value: 75 } });
  });

  it('leaves out an exercise with nothing counted (only warm-ups, or no reps)', () => {
    expect(
      lifts([
        exerciseRow('a', 'Warm-up only', 'weighted', [
          setRow('s', { weightKg: 20, reps: 10, setType: 'warmup' }),
        ]),
        exerciseRow('b', 'No reps', 'weighted', [setRow('t', { weightKg: 20, reps: null })]),
        exerciseRow('c', 'Untouched', 'weighted', [
          setRow('u', { weightKg: 20, reps: 5, status: 'pending' }),
        ]),
      ]),
    ).toEqual([]);
  });

  it('is one exercise when it was added twice, on all its sets and where it first appeared', () => {
    const result = lifts([
      exerciseRow('curl', 'Curl', 'weighted', [setRow('a', { weightKg: 15, reps: 10 })]),
      exerciseRow('row', 'Row', 'weighted', [setRow('b', { weightKg: 50, reps: 8 })]),
      exerciseRow('curl', 'Curl', 'weighted', [setRow('c', { weightKg: 17.5, reps: 8 })]),
    ]);

    expect(result.map((lift) => lift.name)).toEqual(['Curl', 'Row']);
    expect(result[0]).toMatchObject({ sets: 2, best: '17.5 kg × 8' });
  });

  it('marks the exercises that set a record', () => {
    const result = lifts(
      [
        exerciseRow('a', 'A', 'weighted', [setRow('s', { weightKg: 20, reps: 5 })]),
        exerciseRow('b', 'B', 'weighted', [setRow('t', { weightKg: 20, reps: 5 })]),
      ],
      { records: new Set(['b']) },
    );

    expect(result.map((lift) => lift.record)).toEqual([false, true]);
  });
});

describe('bestLifts', () => {
  const heavy = exerciseRow('deadlift', 'Deadlift', 'weighted', [setRow('d', { weightKg: 140, reps: 5 })]);
  const light = exerciseRow('raise', 'Lateral Raise', 'weighted', [setRow('r', { weightKg: 10, reps: 12 })]);
  const mid = exerciseRow('bench', 'Bench Press', 'weighted', [setRow('b', { weightKg: 80, reps: 6 })]);
  const press = exerciseRow('press', 'Shoulder Press', 'weighted', [setRow('p', { weightKg: 40, reps: 8 })]);
  const hold = exerciseRow('plank', 'Plank', 'timed', [setRow('k', { seconds: 90 })]);

  it('shows the three heaviest by estimated one-rep max', () => {
    const top = bestLifts(lifts([light, mid, heavy, press]));

    expect(top.map((lift) => lift.name)).toEqual(['Deadlift', 'Bench Press', 'Shoulder Press']);
  });

  it('shows fewer when the workout had fewer', () => {
    expect(bestLifts(lifts([light, heavy])).map((lift) => lift.name)).toEqual(['Deadlift', 'Lateral Raise']);
    expect(bestLifts([])).toEqual([]);
  });

  it('puts the exercises that set a record first, then the rest by strength', () => {
    const top = bestLifts(lifts([heavy, mid, light, press], { records: new Set(['raise']) }));

    expect(top.map((lift) => lift.name)).toEqual(['Lateral Raise', 'Deadlift', 'Bench Press']);
  });

  it('keeps the order the workout did two equal lifts in', () => {
    const a = exerciseRow('a', 'First', 'weighted', [setRow('x', { weightKg: 50, reps: 10 })]);
    const b = exerciseRow('b', 'Second', 'weighted', [setRow('y', { weightKg: 50, reps: 10 })]);
    const c = exerciseRow('c', 'Third', 'weighted', [setRow('z', { weightKg: 50, reps: 10 })]);

    expect(bestLifts(lifts([c, a, b])).map((lift) => lift.name)).toEqual(['Third', 'First', 'Second']);
  });

  it('ranks a bodyweight lift with the body it carried', () => {
    const pullUp = exerciseRow('pull-up', 'Pull-up', 'bodyweight', [setRow('a', { reps: 10 })]);
    const curl = exerciseRow('curl', 'Curl', 'weighted', [setRow('b', { weightKg: 20, reps: 10 })]);

    // 70 kg × (1 + 10/30) against 20 kg × (1 + 10/30).
    expect(bestLifts(lifts([curl, pullUp])).map((lift) => lift.name)).toEqual(['Pull-up', 'Curl']);
  });

  it('puts a timed hold after every loaded lift, however long', () => {
    const top = bestLifts(lifts([hold, light, press]), 3);

    expect(top.map((lift) => lift.name)).toEqual(['Shoulder Press', 'Lateral Raise', 'Plank']);
  });

  it('ranks timed holds against each other by length', () => {
    const short = exerciseRow('wall-sit', 'Wall sit', 'timed', [setRow('w', { seconds: 30 })]);

    expect(bestLifts(lifts([short, hold])).map((lift) => lift.name)).toEqual(['Plank', 'Wall sit']);
  });

  it('does not change the list it is given', () => {
    const all = lifts([light, heavy]);
    const before = all.map((lift) => lift.name);

    bestLifts(all);

    expect(all.map((lift) => lift.name)).toEqual(before);
  });
});
