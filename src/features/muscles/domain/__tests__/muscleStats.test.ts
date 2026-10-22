import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { everyGroupTwice, hitsByGroup, hitTier, rowsOfWeek, setsByGroup, weekOf } from '../muscleStats';

const row = (
  workoutId: string,
  date: string,
  primary: MuscleSetRow['primaryMuscle'],
  secondary: MuscleSetRow['secondaryMuscles'],
  doneSets = 3,
): MuscleSetRow => ({ workoutId, date, primaryMuscle: primary, secondaryMuscles: secondary, doneSets });

describe('hits per muscle in a week', () => {
  it('counts a muscle once per workout, however many of its exercises it has', () => {
    const hits = hitsByGroup([
      row('w1', '2026-10-20', 'chest', []),
      row('w1', '2026-10-20', 'chest', ['triceps']),
    ]);
    expect(hits.chest).toBe(1);
    expect(hits.triceps).toBe(0.5);
  });

  it('adds a second workout, and a secondary mover counts half', () => {
    const hits = hitsByGroup([
      row('w1', '2026-10-20', 'chest', ['triceps']),
      row('w2', '2026-10-22', 'chest', ['triceps']),
      row('w2', '2026-10-22', 'triceps', []),
    ]);
    expect(hits.chest).toBe(2);
    expect(hits.triceps).toBe(1.5);
    expect(hitTier(hits.chest)).toBe(2);
    expect(hitTier(hits.triceps)).toBe(1);
    expect(hitTier(hits.calves)).toBe(0);
  });

  it('folds the app muscles into the ten groups', () => {
    const hits = hitsByGroup([
      row('w1', '2026-10-20', 'lats', ['forearms', 'traps']),
      row('w1', '2026-10-20', 'adductors', ['abductors']),
    ]);
    expect(hits.back).toBe(1);
    expect(hits.biceps).toBe(0.5);
    expect(hits.quads).toBe(1);
    expect(hits.glutes).toBe(0.5);
  });

  it('ignores an exercise with nothing completed', () => {
    expect(hitsByGroup([row('w1', '2026-10-20', 'calves', [], 0)]).calves).toBe(0);
  });

  it('knows when every muscle was hit twice', () => {
    const all = (
      [
        'chest',
        'shoulders',
        'biceps',
        'triceps',
        'abs',
        'quads',
        'calves',
        'hamstrings',
        'glutes',
        'lats',
      ] as const
    ).flatMap((muscle) => [row('w1', '2026-10-20', muscle, []), row('w2', '2026-10-23', muscle, [])]);
    expect(everyGroupTwice(hitsByGroup(all))).toBe(true);
    expect(everyGroupTwice(hitsByGroup(all.slice(1)))).toBe(false);
  });
});

describe('sets per muscle', () => {
  it('counts a primary set in full and a secondary one half', () => {
    const sets = setsByGroup([
      row('w1', '2026-10-20', 'chest', ['triceps', 'shoulders'], 4),
      row('w2', '2026-10-21', 'triceps', ['forearms'], 2),
    ]);
    expect(sets.chest).toBe(4);
    expect(sets.triceps).toBe(4);
    expect(sets.shoulders).toBe(2);
    expect(sets.biceps).toBe(1);
  });
});

describe('weeks', () => {
  it('run Monday to Sunday', () => {
    expect(weekOf('2026-10-22' as ISODate)).toBe('2026-10-19');
    expect(weekOf('2026-10-25' as ISODate)).toBe('2026-10-19');
    expect(weekOf('2026-10-26' as ISODate)).toBe('2026-10-26');
    const rows = [
      row('w1', '2026-10-18', 'chest', []),
      row('w2', '2026-10-19', 'chest', []),
      row('w3', '2026-10-25', 'chest', []),
    ];
    expect(rowsOfWeek(rows, '2026-10-19' as ISODate).map((one) => one.workoutId)).toEqual(['w2', 'w3']);
  });
});
