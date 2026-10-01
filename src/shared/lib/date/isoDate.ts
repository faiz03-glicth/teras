/** A calendar day as YYYY-MM-DD (no time, no zone). */
export type ISODate = string & { readonly __brand: 'ISODate' };

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True only for real calendar days (rejects 2026-02-30). */
export function isISODate(value: string): value is ISODate {
  const match = PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The local calendar day of a Date. */
export function toISODate(date: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as ISODate;
}
