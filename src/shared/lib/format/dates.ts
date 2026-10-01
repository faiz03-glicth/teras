import { addDays, fromISODate, monthLong, monthShort, weekdayLong, weekdayShort } from '../date/calendar';
import type { ISODate } from '../date/isoDate';

/** 0 → "12:00 AM", 450 → "7:30 AM", 1230 → "8:30 PM" (minutes since local midnight). */
export function formatTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** "Today", "Yesterday", or "Tue, 22 Sep". */
export function dayLabel(day: ISODate, today: ISODate): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  const date = fromISODate(day);
  return `${weekdayShort(date.getDay())}, ${date.getDate()} ${monthShort(date.getMonth())}`;
}

/** "Thursday, 24 September". */
export function longDate(day: ISODate): string {
  const date = fromISODate(day);
  return `${weekdayLong(date.getDay())}, ${date.getDate()} ${monthLong(date.getMonth())}`;
}

/** "Sep 24" (heatmap cell labels). */
export function shortDate(day: ISODate): string {
  const date = fromISODate(day);
  return `${monthShort(date.getMonth())} ${date.getDate()}`;
}

/** 1 → "1 check-in", 3 → "3 check-ins". */
export function checkInCount(count: number): string {
  return `${count} check-in${count === 1 ? '' : 's'}`;
}
