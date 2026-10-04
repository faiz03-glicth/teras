import type { ISODate } from '@/shared/lib/date/isoDate';

import { weeklyRange, weeklyTotals } from '../weekly';

const workout = (date: string, minutes: number, volumeKg: number, reps: number) => ({
  date: date as ISODate,
  durationSeconds: minutes * 60,
  volumeKg,
  reps,
});

// Thursday 1 Oct 2026: its week starts on Monday 28 Sep.
const TODAY = '2026-10-01' as ISODate;

describe('weeklyRange', () => {
  it('runs from the first day of the earliest week to today', () => {
    expect(weeklyRange(TODAY, 3, 'mon')).toEqual({ from: '2026-09-14', to: '2026-10-01' });
  });
});

describe('weeklyTotals', () => {
  it('adds up each week, oldest first, the current week last', () => {
    const weeks = weeklyTotals(
      [
        workout('2026-09-14', 60, 4000, 100),
        workout('2026-09-16', 30, 1000, 40),
        workout('2026-09-29', 45, 2500, 80),
      ],
      TODAY,
      3,
      'mon',
    );

    expect(weeks).toEqual([
      { week: '2026-09-14', seconds: 90 * 60, volumeKg: 5000, reps: 140 },
      { week: '2026-09-21', seconds: 0, volumeKg: 0, reps: 0 },
      { week: '2026-09-28', seconds: 45 * 60, volumeKg: 2500, reps: 80 },
    ]);
  });

  it('keeps a week with no workout as zeros, so the chart shows the gap', () => {
    expect(weeklyTotals([], TODAY, 2, 'mon')).toEqual([
      { week: '2026-09-21', seconds: 0, volumeKg: 0, reps: 0 },
      { week: '2026-09-28', seconds: 0, volumeKg: 0, reps: 0 },
    ]);
  });

  it('leaves out a workout from before the range', () => {
    const weeks = weeklyTotals([workout('2026-09-13', 60, 4000, 100)], TODAY, 3, 'mon');

    expect(weeks.every((week) => week.volumeKg === 0)).toBe(true);
  });

  it('starts weeks on the day asked for', () => {
    // Sunday 27 Sep starts the week holding Thursday 1 Oct.
    expect(weeklyTotals([workout('2026-09-27', 10, 100, 10)], TODAY, 1, 'sun')).toEqual([
      { week: '2026-09-27', seconds: 600, volumeKg: 100, reps: 10 },
    ]);
  });
});
