import { toISODate, type ISODate } from './isoDate';

/**
 * Local calendar arithmetic on ISO days. Every date the app shows or counts is a local calendar day, so
 * these work on local midnight Dates and never on UTC offsets (a day is always a day, DST included).
 */

export type WeekStart = 'mon' | 'sun';

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Names by index (0 = January, 0 = Sunday), '' for anything out of range. */
export const monthShort = (month: number): string => MONTHS_SHORT[month] ?? '';
export const monthLong = (month: number): string => MONTHS_LONG[month] ?? '';
export const weekdayShort = (weekday: number): string => WEEKDAYS_SHORT[weekday] ?? '';
export const weekdayLong = (weekday: number): string => WEEKDAYS_LONG[weekday] ?? '';

/** Local midnight of an ISO day. */
export function fromISODate(day: ISODate): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

export function addDays(day: ISODate, count: number): ISODate {
  const date = fromISODate(day);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + count));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = fromISODate(from);
  const b = fromISODate(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: ISODate): number {
  return fromISODate(day).getDay();
}

/** Position of a weekday in the week as the person sees it (Monday first, or Sunday first). */
export function weekdayIndex(weekday: number, weekStart: WeekStart): number {
  return weekStart === 'mon' ? (weekday + 6) % 7 : weekday;
}

/** The first day of the week `day` falls in. */
export function startOfWeek(day: ISODate, weekStart: WeekStart): ISODate {
  return addDays(day, -weekdayIndex(weekdayOf(day), weekStart));
}

/** A month as year + zero-based month index, like Date. */
export interface YearMonth {
  year: number;
  month: number;
}

export function monthOf(day: ISODate): YearMonth {
  const date = fromISODate(day);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Moves by whole months (normalises the year). */
export function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const date = new Date(year, month + count, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function firstOfMonth({ year, month }: YearMonth): ISODate {
  return toISODate(new Date(year, month, 1));
}

export function lastOfMonth({ year, month }: YearMonth): ISODate {
  return toISODate(new Date(year, month + 1, 0));
}

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Earlier of two ISO days (ISO strings sort as dates). */
export const minDay = (a: ISODate, b: ISODate): ISODate => (a < b ? a : b);

/** Every day from `from` to `to`, inclusive (empty when `to` is earlier). */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Row letters for a heatmap's weekdays, in the person's week order. */
export function weekdayLetters(weekStart: WeekStart): readonly string[] {
  return weekStart === 'mon' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
}

/** Weekday numbers (0 = Sunday) in the person's week order. */
export function weekdayOrder(weekStart: WeekStart): readonly number[] {
  return weekStart === 'mon' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}
