import type { SetStatus } from '@/core/db/schema';

import { loggedExercises, setLabel } from '../session';
import { workoutTotals } from '../totals';

const set = (
  id: string,
  status: SetStatus,
  over: { weightKg?: number | null; reps?: number | null; seconds?: number | null } = {},
) => ({ id, status, weightKg: 60, reps: 8, seconds: null, ...over });

const bench = {
  id: 'we1',
  name: 'Bench Press (Barbell)',
  type: 'weighted' as const,
  sets: [set('s1', 'done'), set('s2', 'pending'), set('s3', 'done', { weightKg: 62.5, reps: 6 })],
};
const curl = {
  id: 'we2',
  name: 'Bicep Curl (Dumbbell)',
  type: 'weighted' as const,
  sets: [set('s4', 'pending')],
};

describe('loggedExercises', () => {
  it('keeps only the sets that were completed: unticked sets are not part of the record', () => {
    const [logged] = loggedExercises([bench]);

    expect(logged?.sets.map((entry) => entry.id)).toEqual(['s1', 's3']);
  });

  it('drops an exercise with nothing completed', () => {
    expect(loggedExercises([bench, curl]).map((exercise) => exercise.id)).toEqual(['we1']);
  });

  it('never changes the workout it was given', () => {
    loggedExercises([bench]);

    expect(bench.sets).toHaveLength(3);
  });
});

describe('setLabel', () => {
  it('reads a weighted set as weight × reps, in the unit shown', () => {
    expect(setLabel(set('a', 'done'), 'weighted', 'kg')).toBe('60 kg × 8');
    expect(setLabel(set('a', 'done', { weightKg: 62.5 }), 'weighted', 'kg')).toBe('62.5 kg × 8');
    expect(setLabel(set('a', 'done'), 'weighted', 'lb')).toBe('132.3 lb × 8');
  });

  it('reads a bodyweight set by its reps, with any weight added', () => {
    expect(setLabel(set('a', 'done', { weightKg: null, reps: 12 }), 'bodyweight', 'kg')).toBe(
      'Bodyweight × 12',
    );
    expect(setLabel(set('a', 'done', { weightKg: 10, reps: 8 }), 'bodyweight', 'kg')).toBe(
      'Bodyweight + 10 kg × 8',
    );
  });

  it('reads a timed set as how long it was held', () => {
    expect(setLabel(set('a', 'done', { weightKg: null, reps: null, seconds: 45 }), 'timed', 'kg')).toBe(
      '45 s',
    );
  });
});

describe('workoutTotals', () => {
  it('adds up one workout by the same rule as its day: completed sets only', () => {
    expect(workoutTotals({ bodyweightKg: 70, exercises: [bench, curl] })).toEqual({
      volumeKg: 60 * 8 + 62.5 * 6,
      sets: 2,
      workouts: 1,
    });
  });

  it('counts bodyweight sets against the bodyweight the workout started with', () => {
    const pullUps = {
      type: 'bodyweight' as const,
      sets: [set('p', 'done', { weightKg: null, reps: 10 })],
    };

    expect(workoutTotals({ bodyweightKg: 72, exercises: [pullUps] }).volumeKg).toBe(720);
  });
});
