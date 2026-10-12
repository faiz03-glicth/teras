import type { ISODate } from '@/shared/lib/date/isoDate';

import { isPastLog, PAST_LOG_SECONDS, pastLogEnd, pastLogStart } from '../pastLog';

const day = (value: string) => value as ISODate;
/** A moment on the local clock, as the repository stores it (ISO, UTC). */
const at = (year: number, month: number, date: number, hours: number, minutes = 0) =>
  new Date(year, month - 1, date, hours, minutes).toISOString();

describe('a workout logged after its day', () => {
  it('is one created on a later day than the day it counts towards', () => {
    expect(isPastLog(day('2026-10-09'), at(2026, 10, 11, 14, 30))).toBe(true);
  });

  it('is not one started today', () => {
    expect(isPastLog(day('2026-10-11'), at(2026, 10, 11, 14, 30))).toBe(false);
  });

  it('is not one started late last night that is still running after midnight', () => {
    // Started on the 10th: its day is the 10th, and it was created on the 10th.
    expect(isPastLog(day('2026-10-10'), at(2026, 10, 10, 23, 50))).toBe(false);
  });

  it('starts on its own day, at the time it was logged', () => {
    const start = new Date(pastLogStart(day('2026-10-09'), at(2026, 10, 11, 14, 30)));
    expect([start.getFullYear(), start.getMonth() + 1, start.getDate()]).toEqual([2026, 10, 9]);
    expect([start.getHours(), start.getMinutes()]).toEqual([14, 30]);
  });

  it('lasts 1 h 40 min, never nothing', () => {
    expect(PAST_LOG_SECONDS).toBe(6000);
    const start = at(2026, 10, 9, 14, 30);
    expect(new Date(pastLogEnd(start)).getTime() - new Date(start).getTime()).toBe(6000 * 1000);
  });
});
