import type { YearMonth } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { at, first } from '@test/fakes/at';

import type { HeatLevel } from '../grid';
import {
  buildMonthGrid,
  calendarRows,
  dayCell,
  monthLabel,
  monthRangeLabel,
  recentMonths,
  type WaveOptions,
} from '../trainingWave';

const TODAY = '2026-10-01' as ISODate; // a Thursday

const options = (over: Partial<WaveOptions> = {}): WaveOptions => ({
  levelOn: () => 0,
  today: TODAY,
  weekStart: 'mon',
  ...over,
});

const month = (year: number, zeroBasedMonth: number): YearMonth => ({ year, month: zeroBasedMonth });

describe('dayCell', () => {
  it('takes the level the day was given', () => {
    const levels: Record<string, HeatLevel> = { '2026-09-30': 3 };
    const cell = dayCell('2026-09-30' as ISODate, options({ levelOn: (day) => levels[day] ?? 0 }));

    expect(cell).toMatchObject({ key: '2026-09-30', level: 3, state: 'default' });
  });

  it('names the level in the spoken label, so the colour is not the only cue', () => {
    const cell = dayCell('2026-09-30' as ISODate, options({ levelOn: () => 3 }));

    expect(cell.label).toBe('Sep 30: Strong');
  });

  it('says "No workout" for an untrained day', () => {
    expect(dayCell('2026-09-29' as ISODate, options()).label).toBe('Sep 29: No workout');
  });

  it('marks today, in its look and in what a screen reader hears', () => {
    const cell = dayCell(TODAY, options());

    expect(cell).toMatchObject({ state: 'today' });
    expect(cell.label).toBe('Oct 1, today: No workout');
  });

  it('leaves days ahead hollow and unlabelled: there is nothing to read out or open', () => {
    const tomorrow = dayCell('2026-10-02' as ISODate, options());

    expect(tomorrow).toMatchObject({ level: 0, state: 'future' });
    expect(tomorrow.label).toBeUndefined();
  });

  it('names the year of a day from an earlier year, so years of history never sound alike', () => {
    expect(dayCell('2025-09-30' as ISODate, options({ levelOn: () => 3 })).label).toBe(
      'Sep 30, 2025: Strong',
    );
  });

  it('never asks for the level of a day that has not happened', () => {
    const asked: string[] = [];
    dayCell('2026-10-05' as ISODate, options({ levelOn: (day) => (asked.push(day), 0) }));

    expect(asked).toEqual([]);
  });
});

describe('monthLabel', () => {
  it("is the short month, with the year for a month from another year than today's", () => {
    expect(monthLabel(month(2026, 8), TODAY)).toBe('Sep');
    expect(monthLabel(month(2025, 8), TODAY)).toBe('Sep 2025');
  });
});

describe('buildMonthGrid', () => {
  it('lays a month out as week columns, led by blanks up to the weekday it starts on', () => {
    // September 2026 starts on a Tuesday: one blank above it in a Monday-first week.
    const grid = buildMonthGrid(month(2026, 8), options());
    const firstWeek = first(grid.columns, 'week');

    expect(firstWeek.map((cell) => cell.state)).toEqual([
      'blank',
      'default',
      'default',
      'default',
      'default',
      'default',
      'default',
    ]);
    expect(at(firstWeek, 1, 'day').key).toBe('2026-09-01');
  });

  it('holds every day of the month exactly once, in order', () => {
    const grid = buildMonthGrid(month(2026, 8), options());
    const days = grid.columns.flat().filter((cell) => cell.state !== 'blank');

    expect(days).toHaveLength(30);
    expect(first(days, 'day').key).toBe('2026-09-01');
    expect(at(days, 29, 'day').key).toBe('2026-09-30');
  });

  it('stops the last week at the last day rather than padding it', () => {
    const grid = buildMonthGrid(month(2026, 8), options());

    // 1 blank + 30 days = 31 cells: four full weeks and three days.
    expect(grid.columns).toHaveLength(5);
    expect(at(grid.columns, 4, 'week')).toHaveLength(3);
  });

  it('follows a Sunday-first week too', () => {
    const grid = buildMonthGrid(month(2026, 8), options({ weekStart: 'sun' }));

    expect(first(grid.columns, 'week').filter((cell) => cell.state === 'blank')).toHaveLength(2);
  });

  it('reads each day its level, marks today, and leaves the rest of the month ahead', () => {
    const levels: Record<string, HeatLevel> = { '2026-10-01': 4 };
    const grid = buildMonthGrid(month(2026, 9), options({ levelOn: (day) => levels[day] ?? 0 }));
    const days = grid.columns.flat().filter((cell) => cell.state !== 'blank');

    expect(first(days, 'day')).toMatchObject({ key: '2026-10-01', level: 4, state: 'today' });
    expect(days.slice(1).every((cell) => cell.state === 'future')).toBe(true);
  });
});

describe('recentMonths', () => {
  it('is this month and the ones before it, oldest first', () => {
    expect(recentMonths(TODAY, 3)).toEqual([month(2026, 7), month(2026, 8), month(2026, 9)]);
  });

  it('crosses into the previous year', () => {
    expect(recentMonths('2026-01-15' as ISODate, 3)).toEqual([
      month(2025, 10),
      month(2025, 11),
      month(2026, 0),
    ]);
  });
});

describe('calendarRows', () => {
  it('starts with the months Home shows', () => {
    expect(first(calendarRows(TODAY, null), 'row')).toEqual(recentMonths(TODAY, 3));
  });

  it('is a single row while there is nothing older to show', () => {
    expect(calendarRows(TODAY, null)).toHaveLength(1);
    expect(calendarRows(TODAY, '2026-08-20' as ISODate)).toHaveLength(1);
  });

  it('reaches back, three months a row, newest first, until the first training day is covered', () => {
    const rows = calendarRows(TODAY, '2026-02-10' as ISODate);

    expect(rows).toEqual([
      [month(2026, 7), month(2026, 8), month(2026, 9)],
      [month(2026, 4), month(2026, 5), month(2026, 6)],
      [month(2026, 1), month(2026, 2), month(2026, 3)],
    ]);
  });

  it('stops at a sane distance even if a day was logged under a wrong clock', () => {
    expect(calendarRows(TODAY, '1970-01-01' as ISODate).length).toBeLessThanOrEqual(40);
  });
});

describe('monthRangeLabel', () => {
  it('names the first and last month with the year once', () => {
    expect(monthRangeLabel(recentMonths(TODAY, 3))).toBe('Aug – Oct 2026');
  });

  it('names both years when the range crosses one', () => {
    expect(monthRangeLabel(recentMonths('2026-01-15' as ISODate, 3))).toBe('Nov 2025 – Jan 2026');
  });

  it('names a single month on its own', () => {
    expect(monthRangeLabel([month(2026, 9)])).toBe('Oct 2026');
    expect(monthRangeLabel([])).toBe('');
  });
});
