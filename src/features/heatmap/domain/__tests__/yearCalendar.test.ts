import type { ISODate } from '@/shared/lib/date/isoDate';
import { at, first } from '@test/fakes/at';

import {
  buildYearDays,
  calendarYears,
  countsLabel,
  gridPaths,
  isLocked,
  monthCountLabel,
  monthDays,
  monthGrid,
  monthMarks,
  NO_DETAILS,
  totalsOf,
  yearStrip,
  type DayLook,
} from '../yearCalendar';

const d = (value: string) => value as ISODate;
const FLAT = { cell: 5, gap: 1, radius: 0, dot: 2 };
const cells = (paths: { heat: readonly string[]; future: string }) =>
  [...paths.heat, paths.future].join('').split('z').length - 1;

describe('buildYearDays', () => {
  const year = buildYearDays(
    2021,
    [
      { date: d('2021-03-04'), level: 3, workouts: 2 },
      { date: d('2021-03-05'), level: 0, workouts: 1 },
      { date: d('2021-03-06'), level: 2, workouts: 1 },
      { date: d('2020-12-31'), level: 4, workouts: 1 },
    ],
    [d('2021-03-06'), d('2021-07-01'), d('2021-07-01'), d('2022-01-01')],
  );

  it('keeps a trained day at its level and counts its workouts by month', () => {
    expect(year.looks.get(d('2021-03-04'))).toBe(3);
    expect(year.workouts[2]).toBe(4);
  });

  it('leaves an emptied day out of the looks but still counts its workouts', () => {
    expect(year.looks.has(d('2021-03-05'))).toBe(false);
  });

  it('marks a Streak date with nothing trained as no details, once, and never over a trained day', () => {
    expect(year.looks.get(d('2021-07-01'))).toBe(NO_DETAILS);
    expect(year.noDetails[6]).toBe(1);
    expect(year.looks.get(d('2021-03-06'))).toBe(2);
    expect(year.noDetails[2]).toBe(0);
  });

  it('ignores dates from other years', () => {
    expect(year.looks.has(d('2020-12-31'))).toBe(false);
    expect(year.looks.has(d('2022-01-01'))).toBe(false);
    expect(totalsOf(year)).toEqual({ workouts: 4, noDetails: 1 });
    expect(totalsOf(year, 6)).toEqual({ workouts: 0, noDetails: 1 });
    expect(totalsOf(year, 12)).toEqual({ workouts: 0, noDetails: 0 });
  });
});

describe('labels', () => {
  it.each([
    [0, 0, 'Nothing logged'],
    [1, 0, '1 workout'],
    [59, 0, '59 workouts'],
    [59, 1, '59 workouts · 1 no details'],
    [0, 2, '2 no details'],
    [0, 1, '1 no details'],
  ])('countsLabel(%i, %i) is %s', (workouts, noDetails, label) => {
    expect(countsLabel(workouts, noDetails)).toBe(label);
  });

  it.each([
    [0, 0, false, 'Nothing'],
    [1, 0, false, '1 workout'],
    [8, 0, false, '8 workouts'],
    [8, 2, false, '8 workouts + 2'],
    [0, 2, false, '2 no details'],
    [8, 2, true, 'Not yet'],
  ])('monthCountLabel(%i, %i, %s) is %s', (workouts, noDetails, future, label) => {
    expect(monthCountLabel(workouts, noDetails, future)).toBe(label);
  });
});

describe('gridPaths', () => {
  it('draws a trained day as one rect in its level', () => {
    const paths = gridPaths(
      d('2021-01-04'),
      d('2021-01-04'),
      new Map([[d('2021-01-04'), 2]]),
      d('2021-12-31'),
      FLAT,
    );
    expect(paths.heat[2]).toBe('M0 0h5v5h-5z');
    expect(paths.heat[0]).toBe('');
    expect(paths.future).toBe('');
    expect(paths.columns).toBe(1);
  });

  it('draws a no-details day as an empty cell with a dot (Tuesday: row 1)', () => {
    const looks = new Map<ISODate, DayLook>([[d('2021-01-05'), NO_DETAILS]]);
    const paths = gridPaths(d('2021-01-05'), d('2021-01-05'), looks, d('2021-12-31'), FLAT);
    expect(paths.heat[0]).toBe('M0 6h5v5h-5z');
    expect(paths.dots).toBe('M1.5 8.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0z');
  });
});

describe('yearStrip', () => {
  it('lays a year out in week columns, every day drawn once, today marked', () => {
    const strip = yearStrip(2021, new Map(), d('2021-06-15'));
    expect(strip).toMatchObject({ columns: 53, width: 317, height: 41 });
    expect(cells(strip)).toBe(365);
    expect(strip.future).not.toBe('');
    expect(strip.today).not.toBeNull();
  });

  it('takes 54 columns for a leap year that starts on a Sunday, 53 otherwise', () => {
    expect(yearStrip(2024, new Map(), d('2030-01-01')).columns).toBe(53);
    expect(yearStrip(2012, new Map(), d('2030-01-01')).columns).toBe(54);
  });

  it('has nothing to come and no today for a year long past', () => {
    const strip = yearStrip(2021, new Map(), d('2030-01-01'));
    expect(strip.future).toBe('');
    expect(strip.today).toBeNull();
  });

  it('places each month name over the column of its first day', () => {
    const marks = monthMarks(2021);
    expect(first(marks)).toEqual({ month: 0, label: 'Jan', column: 0 });
    expect(at(marks, 1)).toEqual({ month: 1, label: 'Feb', column: 5 });
  });
});

describe('monthGrid and monthDays', () => {
  it('draws only the month itself', () => {
    expect(cells(monthGrid(2026, 1, new Map(), d('2030-01-01')))).toBe(28);
  });

  it('pads a month into Monday-first weeks', () => {
    const weeks = monthDays(2026, 9, new Map(), d('2026-10-12'));
    expect(weeks).toHaveLength(5);
    expect(first(weeks).slice(0, 3)).toEqual([null, null, null]);
    expect(at(first(weeks), 3)).toMatchObject({ day: 1, date: '2026-10-01' });
    expect(at(at(weeks, 4), 6)).toBeNull();
    const days = weeks.flat();
    expect(days.find((tile) => tile?.date === '2026-10-12')).toMatchObject({ today: true, future: false });
    expect(days.find((tile) => tile?.date === '2026-10-13')).toMatchObject({ today: false, future: true });
  });
});

describe('years', () => {
  it('lists every year once, newest first', () => {
    expect(calendarYears([2021, 2026], [2026, 2019])).toEqual([2026, 2021, 2019]);
  });

  it('is locked until there are two years', () => {
    expect(isLocked([2026])).toBe(true);
    expect(isLocked([2026, 2025])).toBe(false);
  });
});
