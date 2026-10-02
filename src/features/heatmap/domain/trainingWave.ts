import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import {
  addMonths,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  monthOf,
  monthShort,
  weekdayIndex,
  weekdayOf,
  type WeekStart,
  type YearMonth,
} from '@/shared/lib/date/calendar';
import { shortDate } from '@/shared/lib/format/dates';
import type { ISODate } from '@/shared/lib/date/isoDate';

import type { HeatGrid, HeatGridCell, HeatLevel } from './grid';

/**
 * What the training wave needs to draw itself. It asks for a day's level rather than its volume: the
 * level was computed and frozen when the day was logged (decision 7), so the wave only reads it back.
 */
export interface WaveOptions {
  levelOn: (day: ISODate) => HeatLevel;
  today: ISODate;
  weekStart: WeekStart;
}

/** Home's wave: this month and the two before it, as in the prototype. */
export const MONTHS_PER_ROW = 3;
/** The Calendar never reaches back further than this, even if a day was logged under a wrong clock. */
const MAX_CALENDAR_ROWS = 40;

/**
 * PURE: one day of the wave. A day still to come is hollow and carries no label, because there is
 * nothing to read out and nothing to open.
 */
export function dayCell(day: ISODate, options: WaveOptions): HeatGridCell {
  if (day > options.today) return { key: day, level: 0, state: 'future' };
  const level = options.levelOn(day);
  const isToday = day === options.today;
  // The level is named, not just coloured: colour alone is not an accessible way to say "Peak". The
  // ring of the day whose sheet is open is the view's business, so opening one rebuilds no grid.
  return {
    key: day,
    level,
    state: isToday ? 'today' : 'default',
    label: `${shortDate(day, options.today)}${isToday ? ', today' : ''}: ${LEVEL_NAMES[level]}`,
  };
}

const blank = (index: number): HeatGridCell => ({ key: `blank-${index}`, level: 0, state: 'blank' });

/**
 * PURE: a month as heatmap columns, one per week with its days top to bottom, led by blanks up to the
 * weekday it starts on. The last week stops at the month's last day, so months sit side by side without
 * a ragged run of empty cells between them.
 */
export function buildMonthGrid(month: YearMonth, options: WaveOptions): HeatGrid {
  const first = firstOfMonth(month);
  const offset = weekdayIndex(weekdayOf(first), options.weekStart);
  const cells = [
    ...Array.from({ length: offset }, (_, index) => blank(index)),
    ...eachDay(first, lastOfMonth(month)).map((day) => dayCell(day, options)),
  ];
  const columns: HeatGridCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) columns.push(cells.slice(start, start + 7));
  return { columns };
}

/** PURE: the months Home's wave covers: this one and the `count - 1` before it, oldest first. */
export function recentMonths(today: ISODate, count: number): YearMonth[] {
  const current = monthOf(today);
  return Array.from({ length: count }, (_, index) => addMonths(current, index - (count - 1)));
}

const monthNumber = ({ year, month }: YearMonth) => year * 12 + month;

/**
 * PURE: the Calendar's rows of three months, newest first. The first row is exactly what Home shows;
 * older rows follow until the first training day is covered, so every logged day can be opened.
 */
export function calendarRows(today: ISODate, earliest: ISODate | null): YearMonth[][] {
  const reach = earliest ? monthNumber(monthOf(earliest)) : Infinity;
  const rows = [recentMonths(today, MONTHS_PER_ROW)];
  let start = rows[0]?.[0];
  while (start && monthNumber(start) > reach && rows.length < MAX_CALENDAR_ROWS) {
    const from = addMonths(start, -MONTHS_PER_ROW);
    rows.push(Array.from({ length: MONTHS_PER_ROW }, (_, index) => addMonths(from, index)));
    start = from;
  }
  return rows;
}

/** PURE: a month's heading over the wave: "Sep", or "Sep 2025" in another year than today's. */
export function monthLabel(month: YearMonth, today: ISODate): string {
  const year = monthOf(today).year;
  return month.year === year ? monthShort(month.month) : `${monthShort(month.month)} ${month.year}`;
}

/** PURE: "Aug – Oct 2026"; across a new year both years show, "Nov 2025 – Jan 2026". */
export function monthRangeLabel(months: readonly YearMonth[]): string {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return '';
  if (monthNumber(first) === monthNumber(last)) return `${monthShort(first.month)} ${first.year}`;
  if (first.year === last.year) return `${monthShort(first.month)} – ${monthShort(last.month)} ${last.year}`;
  return `${monthShort(first.month)} ${first.year} – ${monthShort(last.month)} ${last.year}`;
}
