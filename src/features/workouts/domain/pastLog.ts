import { fromISODate } from '@/shared/lib/date/calendar';
import { toISODate, type ISODate } from '@/shared/lib/date/isoDate';

/**
 * A workout logged after its day ("Log a workout" on a past day of the wave) is a plain log: it was not
 * timed, so it has no clock and no rest, and it is saved as a typical session of this length.
 */
export const PAST_LOG_SECONDS = 100 * 60;

/**
 * PURE: whether a workout was logged after its day: created on a later local day than the day it counts
 * towards. A workout started late in the evening and still running after midnight was created on its own
 * day, so it stays live.
 */
export function isPastLog(date: ISODate, createdAt: string): boolean {
  return toISODate(new Date(createdAt)) > date;
}

/** PURE: when a past log starts: on its own day, at the clock time it was logged (`now`, ISO). */
export function pastLogStart(date: ISODate, now: string): string {
  const clock = new Date(now);
  const start = fromISODate(date);
  start.setHours(clock.getHours(), clock.getMinutes(), clock.getSeconds(), 0);
  return start.toISOString();
}

/** PURE: when a past log ends: PAST_LOG_SECONDS after it started, so its duration is never empty. */
export function pastLogEnd(startedAt: string): string {
  return new Date(new Date(startedAt).getTime() + PAST_LOG_SECONDS * 1000).toISOString();
}
