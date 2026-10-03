import type { ISODate } from '@/shared/lib/date/isoDate';

import { e1rm, exerciseSummary, weeklyBests, type ExerciseSession } from '../progress';
import type { RecordSet } from '../records';

const done = (weightKg: number | null, reps: number | null, seconds: number | null = null): RecordSet => ({
  status: 'done',
  setType: 'normal',
  weightKg,
  reps,
  seconds,
});

const session = (id: string, date: string, sets: RecordSet[]): ExerciseSession => ({
  workoutId: id,
  name: 'Push Day',
  date: date as ISODate,
  startedAt: `${date}T18:00:00.000Z`,
  sets,
});

describe('e1rm', () => {
  it('estimates a one-rep max with the Epley formula', () => {
    expect(e1rm(60, 8)).toBeCloseTo(76, 5);
    expect(e1rm(100, 0)).toBe(100);
  });
});

describe('exerciseSummary', () => {
  const sessions = [
    session('w2', '2026-09-29', [done(62.5, 5), done(60, 8)]),
    session('w1', '2026-09-22', [done(60, 6)]),
  ];

  it('gives the all-time best, the best estimated max and how many sessions', () => {
    const summary = exerciseSummary('weighted', sessions);

    expect(summary.best).toBe(62.5);
    expect(summary.e1rm).toBeCloseTo(76, 5);
    expect(summary.sessions).toBe(2);
  });

  it('leaves the estimated max out for an exercise that is not lifted for weight', () => {
    expect(exerciseSummary('bodyweight', [session('w1', '2026-09-22', [done(null, 12)])])).toEqual({
      best: 12,
      e1rm: null,
      sessions: 1,
      recordIds: ['w1'],
    });
  });

  it('marks the sessions that hold the record', () => {
    expect(exerciseSummary('weighted', sessions).recordIds).toEqual(['w2']);
  });
});

describe('weeklyBests', () => {
  it('takes the best set of each week trained, oldest first', () => {
    const bests = weeklyBests('weighted', [
      session('w3', '2026-09-30', [done(65, 3)]),
      session('w2', '2026-09-29', [done(62.5, 5)]),
      session('w1', '2026-09-15', [done(60, 6)]),
    ]);

    expect(bests).toEqual([
      { week: '2026-09-14', value: 60 },
      { week: '2026-09-28', value: 65 },
    ]);
  });

  it('keeps only the most recent weeks', () => {
    // One session a week for 14 weeks, from Monday 6 July 2026.
    const sessions = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(Date.UTC(2026, 6, 6 + index * 7)).toISOString().slice(0, 10);
      return session(`w${index}`, day, [done(50 + index, 5)]);
    });

    const bests = weeklyBests('weighted', sessions, 12);

    expect(bests).toHaveLength(12);
    expect(bests.at(-1)).toEqual({ week: '2026-10-05', value: 63 });
  });
});
