import {
  daysBetween,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  monthShort,
  startOfWeek,
  weekdayIndex,
  weekdayOf,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import type { HeatLevel } from './grid';

/** A day logged on Streak with no workout details. */
export const NO_DETAILS = -1;
/** How a day looks on the year Calendar: its heat level, or logged with no details. */
export type DayLook = HeatLevel | typeof NO_DETAILS;

/** One recorded training day, as `workout_days` gives it. */
export interface DayRecord {
  date: ISODate;
  level: HeatLevel;
  workouts: number;
}

/** One year as all three Calendar levels read it. */
export interface YearDays {
  year: number;
  /** Only days with something: a trained level (1–4) or NO_DETAILS. A missing day is "nothing logged". */
  looks: ReadonlyMap<ISODate, DayLook>;
  /** Workouts per month, January first (12 entries). */
  workouts: readonly number[];
  /** Days logged with no details per month (12 entries). */
  noDetails: readonly number[];
}

export interface GridGeometry {
  cell: number;
  gap: number;
  radius: number;
  dot: number;
}
/** Level 1's year strip. Square cells: a rounded one is four arcs more per day, 365 days a strip. */
export const STRIP_GEOMETRY: GridGeometry = { cell: 5, gap: 1, radius: 0, dot: 1.4 };
/** Level 2's month card grid. */
export const MONTH_GEOMETRY: GridGeometry = { cell: 10, gap: 2, radius: 2.5, dot: 2 };

/** A grid drawn as one path per look (see HeatPaths). */
export interface GridPaths {
  columns: number;
  width: number;
  height: number;
  /** Path data per heat level (index = level) for days up to today; a no-details day sits in level 0. */
  heat: readonly [string, string, string, string, string];
  /** Path data for the days still to come. */
  future: string;
  /** Path data: a dot in the middle of each no-details day. */
  dots: string;
  /** Top-left of today's cell, or null when today is not in the range. */
  today: { x: number; y: number } | null;
}

/** One day of Level 3's month grid. */
export interface DayTile {
  date: ISODate;
  day: number;
  look: DayLook;
  future: boolean;
  today: boolean;
}

const MONTHS = 12;
const WEEK = 7;
const monthIndex = (date: string) => Number(date.slice(5, 7)) - 1;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const workoutsText = (count: number) => plural(count, 'workout', 'workouts');
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/**
 * PURE: a year's days from its recorded days and its Streak dates. A trained day keeps its frozen level; a
 * Streak date with nothing trained is a no-details day. Dates outside the year are ignored.
 */
export function buildYearDays(
  year: number,
  days: readonly DayRecord[],
  streakDates: readonly ISODate[],
): YearDays {
  const prefix = String(year);
  const looks = new Map<ISODate, DayLook>();
  const workouts = Array.from({ length: MONTHS }, () => 0);
  const noDetails = Array.from({ length: MONTHS }, () => 0);

  for (const record of days) {
    if (!record.date.startsWith(prefix)) continue;
    const month = monthIndex(record.date);
    workouts[month] = (workouts[month] ?? 0) + record.workouts;
    if (record.level >= 1) looks.set(record.date, record.level);
  }
  for (const date of streakDates) {
    if (!date.startsWith(prefix) || looks.has(date)) continue;
    const month = monthIndex(date);
    looks.set(date, NO_DETAILS);
    noDetails[month] = (noDetails[month] ?? 0) + 1;
  }
  return { year, looks, workouts, noDetails };
}

/** PURE: the year's workouts and no-details days, or one month's. */
export function totalsOf(days: YearDays, month?: number): { workouts: number; noDetails: number } {
  if (month === undefined) return { workouts: sum(days.workouts), noDetails: sum(days.noDetails) };
  return { workouts: days.workouts[month] ?? 0, noDetails: days.noDetails[month] ?? 0 };
}

/** PURE: "59 workouts · 1 no details" (a year card, a month's header). */
export function countsLabel(workouts: number, noDetails: number): string {
  if (workouts === 0 && noDetails === 0) return 'Nothing logged';
  if (noDetails === 0) return workoutsText(workouts);
  if (workouts === 0) return `${noDetails} no details`;
  return `${workoutsText(workouts)} · ${noDetails} no details`;
}

/** PURE: a month card's count: "8 workouts + 2", "Nothing", or "Not yet" for a month to come. */
export function monthCountLabel(workouts: number, noDetails: number, future: boolean): string {
  if (future) return 'Not yet';
  if (workouts === 0 && noDetails === 0) return 'Nothing';
  if (noDetails === 0) return workoutsText(workouts);
  if (workouts === 0) return `${noDetails} no details`;
  return `${workoutsText(workouts)} + ${noDetails}`;
}

const num = (value: number) => String(Math.round(value * 100) / 100);

function rectPath(x: number, y: number, { cell, radius }: GridGeometry): string {
  if (radius === 0) return `M${num(x)} ${num(y)}h${num(cell)}v${num(cell)}h${num(-cell)}z`;
  const r = num(radius);
  const side = cell - 2 * radius;
  const corner = (dx: number, dy: number) => `a${r} ${r} 0 0 1 ${num(dx)} ${num(dy)}`;
  return (
    `M${num(x + radius)} ${num(y)}h${num(side)}${corner(radius, radius)}v${num(side)}` +
    `${corner(-radius, radius)}h${num(-side)}${corner(-radius, -radius)}v${num(-side)}${corner(radius, -radius)}z`
  );
}

function circlePath(cx: number, cy: number, radius: number): string {
  const r = num(radius);
  return `M${num(cx - radius)} ${num(cy)}a${r} ${r} 0 1 0 ${num(2 * radius)} 0a${r} ${r} 0 1 0 ${num(-2 * radius)} 0z`;
}

/**
 * PURE: a run of days as week columns (Monday on top) drawn as a few paths, one per look, never one shape
 * per day. Days of the first and last week outside the range are left blank.
 */
export function gridPaths(
  from: ISODate,
  to: ISODate,
  looks: ReadonlyMap<ISODate, DayLook>,
  today: ISODate,
  geometry: GridGeometry,
): GridPaths {
  const start = startOfWeek(from, 'mon');
  const lead = daysBetween(start, from);
  const step = geometry.cell + geometry.gap;
  const columns = Math.floor(daysBetween(start, to) / WEEK) + 1;
  const heat: [string[], string[], string[], string[], string[]] = [[], [], [], [], []];
  const future: string[] = [];
  const dots: string[] = [];
  let todayAt: GridPaths['today'] = null;

  eachDay(from, to).forEach((day, index) => {
    const x = Math.floor((lead + index) / WEEK) * step;
    const y = ((lead + index) % WEEK) * step;
    if (day === today) todayAt = { x, y };
    if (day > today) {
      future.push(rectPath(x, y, geometry));
      return;
    }
    const look = looks.get(day) ?? 0;
    if (look === NO_DETAILS) {
      heat[0].push(rectPath(x, y, geometry));
      dots.push(circlePath(x + geometry.cell / 2, y + geometry.cell / 2, geometry.dot / 2));
    } else {
      heat[look].push(rectPath(x, y, geometry));
    }
  });

  return {
    columns,
    width: columns * step - geometry.gap,
    height: WEEK * step - geometry.gap,
    heat: [heat[0].join(''), heat[1].join(''), heat[2].join(''), heat[3].join(''), heat[4].join('')],
    future: future.join(''),
    dots: dots.join(''),
    today: todayAt,
  };
}

/** PURE: a whole year as Level 1's strip. */
export function yearStrip(year: number, looks: ReadonlyMap<ISODate, DayLook>, today: ISODate): GridPaths {
  return gridPaths(`${year}-01-01` as ISODate, `${year}-12-31` as ISODate, looks, today, STRIP_GEOMETRY);
}

/** PURE: one month (zero-based) as a Level 2 card's mini grid. */
export function monthGrid(
  year: number,
  month: number,
  looks: ReadonlyMap<ISODate, DayLook>,
  today: ISODate,
): GridPaths {
  return gridPaths(firstOfMonth({ year, month }), lastOfMonth({ year, month }), looks, today, MONTH_GEOMETRY);
}

/** PURE: where each month's name sits over the year strip: the column of its first day. */
export function monthMarks(year: number): { month: number; label: string; column: number }[] {
  const start = startOfWeek(`${year}-01-01` as ISODate, 'mon');
  return Array.from({ length: MONTHS }, (_, month) => ({
    month,
    label: monthShort(month),
    column: Math.floor(daysBetween(start, firstOfMonth({ year, month })) / WEEK),
  }));
}

/** PURE: a month (zero-based) as weeks of seven, Monday first, padded with nulls. */
export function monthDays(
  year: number,
  month: number,
  looks: ReadonlyMap<ISODate, DayLook>,
  today: ISODate,
): (DayTile | null)[][] {
  const first = firstOfMonth({ year, month });
  const lead = weekdayIndex(weekdayOf(first), 'mon');
  const slots: (DayTile | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...eachDay(first, lastOfMonth({ year, month })).map((date) => ({
      date,
      day: Number(date.slice(8, 10)),
      look: looks.get(date) ?? 0,
      future: date > today,
      today: date === today,
    })),
  ];
  while (slots.length % WEEK !== 0) slots.push(null);
  return Array.from({ length: slots.length / WEEK }, (_, week) =>
    slots.slice(week * WEEK, week * WEEK + WEEK),
  );
}

/** PURE: every year with a trained day or a Streak date, once each, newest first. */
export function calendarYears(workoutYears: readonly number[], streakYears: readonly number[]): number[] {
  return [...new Set([...workoutYears, ...streakYears])].sort((a, b) => b - a);
}

/** PURE: the years list needs this year and an earlier one; until then Level 1 shows the locked card. */
export function isLocked(years: readonly number[]): boolean {
  return years.length < 2;
}
