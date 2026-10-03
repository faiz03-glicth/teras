import type { ISODate } from '../../date/isoDate';
import { clockTime, dayLabel, shortDate, shortDay } from '../dates';

const TODAY = '2026-10-02' as ISODate; // a Friday

describe('shortDay', () => {
  it('names the weekday, the date and the month', () => {
    expect(shortDay('2026-09-28' as ISODate)).toBe('Mon, 28 Sep');
    expect(shortDay(TODAY)).toBe('Fri, 2 Oct');
  });

  it("adds the year to a day from another year than today's, and only then", () => {
    expect(shortDay('2025-09-30' as ISODate, TODAY)).toBe('Tue, 30 Sep 2025');
    expect(shortDay('2026-01-05' as ISODate, TODAY)).toBe('Mon, 5 Jan');
  });
});

describe('shortDate', () => {
  it("is the month and date, with the year for a day from another year than today's", () => {
    expect(shortDate('2026-09-24' as ISODate, TODAY)).toBe('Sep 24');
    expect(shortDate('2025-09-24' as ISODate, TODAY)).toBe('Sep 24, 2025');
  });
});

describe('dayLabel', () => {
  it('says Today and Yesterday, and the short day otherwise', () => {
    expect(dayLabel(TODAY, TODAY)).toBe('Today');
    expect(dayLabel('2026-10-01' as ISODate, TODAY)).toBe('Yesterday');
    expect(dayLabel('2026-09-28' as ISODate, TODAY)).toBe('Mon, 28 Sep');
  });

  it('names the year of a day from an earlier year', () => {
    expect(dayLabel('2025-12-31' as ISODate, '2026-01-01' as ISODate)).toBe('Yesterday');
    expect(dayLabel('2025-12-30' as ISODate, '2026-01-01' as ISODate)).toBe('Tue, 30 Dec 2025');
  });
});

describe('clockTime', () => {
  it('reads a moment as the local time on a 24-hour clock', () => {
    expect(clockTime(new Date(2026, 9, 2, 18, 20).toISOString())).toBe('18:20');
    expect(clockTime(new Date(2026, 9, 2, 7, 5).toISOString())).toBe('07:05');
    expect(clockTime(new Date(2026, 9, 2, 0, 0).toISOString())).toBe('00:00');
  });

  it('reads nothing for a timestamp it cannot understand', () => {
    expect(clockTime('not a time')).toBe('');
  });
});
