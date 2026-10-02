import { monthOf, type YearMonth } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

export interface MonthGroup<T> {
  month: YearMonth;
  items: T[];
}

/**
 * PURE: dated items, newest first, gathered by calendar month (the Calendar's "September · 8 workouts").
 * Months come newest first and each keeps its items in the order they arrived.
 */
export function groupByMonth<T extends { date: ISODate }>(items: readonly T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const month = monthOf(item.date);
    const last = groups.at(-1);
    if (last && last.month.year === month.year && last.month.month === month.month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}
