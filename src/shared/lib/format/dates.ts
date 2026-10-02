import { addDays, fromISODate, monthLong, monthShort, weekdayLong, weekdayShort } from '../date/calendar';
import type { ISODate } from '../date/isoDate';

/** 0 → "12:00 AM", 450 → "7:30 AM", 1230 → "8:30 PM" (minutes since local midnight). */
export function formatTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** " 2025" when `day` falls in another year than `today`; nothing otherwise (or without a today). */
function otherYear(day: ISODate, today: ISODate | undefined, separator: string): string {
  return today && day.slice(0, 4) !== today.slice(0, 4) ? `${separator}${day.slice(0, 4)}` : '';
}

/** "Tue, 22 Sep"; "Tue, 30 Sep 2025" when given a today in another year. */
export function shortDay(day: ISODate, today?: ISODate): string {
  const date = fromISODate(day);
  return `${weekdayShort(date.getDay())}, ${date.getDate()} ${monthShort(date.getMonth())}${otherYear(day, today, ' ')}`;
}

/** "Today", "Yesterday", or "Tue, 22 Sep". */
export function dayLabel(day: ISODate, today: ISODate): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return shortDay(day, today);
}

/** A stored timestamp as the local time on a 24-hour clock: "18:20". Blank if it cannot be read. */
export function clockTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "Thursday, 24 September". */
export function longDate(day: ISODate): string {
  const date = fromISODate(day);
  return `${weekdayLong(date.getDay())}, ${date.getDate()} ${monthLong(date.getMonth())}`;
}

/** "Sep 24" (heatmap cell labels); "Sep 24, 2025" when given a today in another year. */
export function shortDate(day: ISODate, today?: ISODate): string {
  const date = fromISODate(day);
  return `${monthShort(date.getMonth())} ${date.getDate()}${otherYear(day, today, ', ')}`;
}

/** 1 → "1 check-in", 3 → "3 check-ins". */
export function checkInCount(count: number): string {
  return `${count} check-in${count === 1 ? '' : 's'}`;
}
