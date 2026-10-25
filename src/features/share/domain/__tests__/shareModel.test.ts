import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { exerciseRow, pushDay, setRow } from '@test/fakes/shareWorkout';

import { copyText } from '../copyText';
import { musclesWorked, workedGroups, workedGroupsText } from '../muscles';
import { buildShareModel, pictureLabel, summaryStats } from '../shareModel';

const TODAY = '2026-10-02' as ISODate;

const row = (over: Partial<MuscleSetRow>): MuscleSetRow => ({
  workoutId: 'w1',
  date: TODAY,
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  doneSets: 3,
  ...over,
});

const model = (over: Partial<Parameters<typeof buildShareModel>[0]> = {}) =>
  buildShareModel({
    workout: pushDay(),
    unit: 'kg',
    today: TODAY,
    records: new Set(['bench-press-barbell']),
    muscleRows: [
      row({ primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'] }),
      row({ primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'] }),
    ],
    ...over,
  });

describe('summaryStats', () => {
  it('gives minutes, volume and completed sets', () => {
    expect(summaryStats(pushDay(), 'kg')).toEqual([
      { value: '62', unit: 'min' },
      { value: '3,095', unit: 'kg' },
      { value: '10', unit: 'sets' },
    ]);
  });

  it('gives the volume in pounds when that is the unit', () => {
    expect(summaryStats(pushDay(), 'lb')[1]).toEqual({ value: '6,823', unit: 'lb' });
  });

  it('says "set" for one set, and counts nothing that was not ticked', () => {
    const workout = pushDay({
      exercises: [
        exerciseRow('a', 'A', 'weighted', [
          setRow('s', { weightKg: 20, reps: 5 }),
          setRow('t', { status: 'pending' }),
        ]),
      ],
    });

    expect(summaryStats(workout, 'kg')).toEqual([
      { value: '62', unit: 'min' },
      { value: '100', unit: 'kg' },
      { value: '1', unit: 'set' },
    ]);
  });

  it('reads 0 minutes for a workout that has not finished, and at least 1 for a quick one', () => {
    expect(summaryStats(pushDay({ endedAt: null }), 'kg')[0]).toEqual({ value: '0', unit: 'min' });
    const started = new Date(2026, 9, 2, 18, 20);
    const quick = pushDay({ endedAt: new Date(started.getTime() + 20_000).toISOString() });
    expect(summaryStats(quick, 'kg')[0]).toEqual({ value: '1', unit: 'min' });
  });
});

describe('musclesWorked', () => {
  it('names the main movers as primary and the helpers as secondary, each once', () => {
    expect(
      musclesWorked([row({ primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'] })], 'w1'),
    ).toEqual({
      primary: ['chest'],
      secondary: ['triceps', 'shoulders'],
    });
  });

  it('never lists a muscle as secondary when another exercise moved it as the main mover', () => {
    const rows = [
      row({ primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'] }),
      row({ primaryMuscle: 'triceps', secondaryMuscles: ['shoulders'] }),
    ];

    expect(musclesWorked(rows, 'w1')).toEqual({ primary: ['chest', 'triceps'], secondary: ['shoulders'] });
  });

  it("reads only this workout's rows, and only exercises with a completed set", () => {
    const rows = [
      row({ primaryMuscle: 'chest' }),
      row({ workoutId: 'other', primaryMuscle: 'quads' }),
      row({ primaryMuscle: 'biceps', doneSets: 0 }),
    ];

    expect(musclesWorked(rows, 'w1')).toEqual({ primary: ['chest'], secondary: [] });
  });

  it('is empty when nothing was worked', () => {
    expect(musclesWorked([], 'w1')).toEqual({ primary: [], secondary: [] });
  });

  it('folds the main movers into the muscle groups the app lists, in its order', () => {
    const highlight = { primary: ['lats', 'chest', 'upper_back'], secondary: ['biceps'] } as const;

    expect(workedGroups(highlight)).toEqual(['chest', 'back']);
    expect(workedGroupsText(highlight)).toBe('Chest, Back');
  });
});

describe('buildShareModel', () => {
  it('words the workout for the picture', () => {
    const result = model();

    expect(result.title).toBe('Push Day');
    expect(result.dateLabel).toBe('Fri, 2 Oct');
    expect(result.stats.map((stat) => `${stat.value} ${stat.unit}`)).toEqual([
      '62 min',
      '3,095 kg',
      '10 sets',
    ]);
    expect(result.lifts.map((lift) => lift.name)).toEqual([
      'Bench Press (Barbell)',
      'Pull-up',
      'Plank',
      'Lateral Raise',
    ]);
    expect(result.muscles).toEqual({ primary: ['chest', 'shoulders'], secondary: ['triceps'] });
    expect(result.musclesText).toBe('Chest, Shoulders');
  });

  it('shows the records first among the three best lifts, then the rest by strength', () => {
    // Bench is the record. Pull-up (70 kg × 1.4) beats the lateral raise; the hold comes after both.
    expect(model().topLifts.map((lift) => lift.name)).toEqual([
      'Bench Press (Barbell)',
      'Pull-up',
      'Lateral Raise',
    ]);
  });

  it('names the year of a workout from another year', () => {
    expect(model({ today: '2027-01-04' as ISODate }).dateLabel).toBe('Fri, 2 Oct 2026');
  });
});

describe('copyText', () => {
  it('is the exact plain-text summary', () => {
    expect(copyText(model())).toBe(
      [
        'Push Day · Fri, 2 Oct',
        '62 min · 3,095 kg · 10 sets',
        '',
        'Bench Press (Barbell): 3 sets, best 62.5 kg × 6 (new record)',
        'Pull-up: 2 sets, best 12 reps',
        'Plank: 2 sets, best 1 min 15 s',
        'Lateral Raise: 3 sets, best 10 kg × 12',
        '',
        'Logged with Teras',
      ].join('\n'),
    );
  });

  it('uses the unit the person chose', () => {
    expect(copyText(model({ unit: 'lb', records: new Set() }))).toContain(
      ['62 min · 6,823 lb · 10 sets', '', 'Bench Press (Barbell): 3 sets, best 137.8 lb × 6'].join('\n'),
    );
  });

  it('says "1 set", not "1 sets"', () => {
    const workout = pushDay({
      exercises: [exerciseRow('a', 'Deadlift', 'weighted', [setRow('s', { weightKg: 140, reps: 5 })])],
    });

    expect(copyText(model({ workout, records: new Set() }))).toContain('Deadlift: 1 set, best 140 kg × 5');
  });

  it('has no gap of blank lines when no exercise has a completed set', () => {
    const workout = pushDay({ exercises: [] });

    expect(copyText(model({ workout }))).toBe(
      ['Push Day · Fri, 2 Oct', '62 min · 0 kg · 0 sets', '', 'Logged with Teras'].join('\n'),
    );
  });
});

describe('pictureLabel', () => {
  it('reads the three big numbers for the summary', () => {
    expect(pictureLabel(model(), 'summary')).toBe('Workout picture: Push Day, 62 min, 3,095 kg, 10 sets');
  });

  it('reads the best lifts for the lifts picture', () => {
    expect(pictureLabel(model(), 'lifts')).toBe(
      'Workout picture: Push Day, best lifts: Bench Press (Barbell) 62.5 kg × 6, Pull-up 12 reps, Lateral Raise 10 kg × 12',
    );
  });

  it('reads the muscles for the muscles picture', () => {
    expect(pictureLabel(model(), 'muscles')).toBe(
      'Workout picture: Push Day, muscles worked: Chest, Shoulders',
    );
  });

  it('says none when there is nothing to show', () => {
    const empty = model({ workout: pushDay({ exercises: [] }), muscleRows: [] });

    expect(pictureLabel(empty, 'lifts')).toBe('Workout picture: Push Day, best lifts: none');
    expect(pictureLabel(empty, 'muscles')).toBe('Workout picture: Push Day, muscles worked: none');
  });
});
