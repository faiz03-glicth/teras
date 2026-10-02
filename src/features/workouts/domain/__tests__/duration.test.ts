import { formatMinutes, sessionSeconds } from '../duration';

describe('sessionSeconds', () => {
  it('is the whole seconds from start to finish', () => {
    expect(sessionSeconds('2026-10-02T09:00:00.000Z', '2026-10-02T10:02:00.000Z')).toBe(62 * 60);
  });

  it('is 0 while a workout has not finished, or if the clock ran backwards', () => {
    expect(sessionSeconds('2026-10-02T09:00:00.000Z', null)).toBe(0);
    expect(sessionSeconds('2026-10-02T09:00:00.000Z', '2026-10-02T08:00:00.000Z')).toBe(0);
  });
});

describe('formatMinutes', () => {
  it('reads a session in whole minutes, as the feed and the session show it', () => {
    expect(formatMinutes(47 * 60)).toBe('47 min');
    expect(formatMinutes(62 * 60)).toBe('62 min');
    expect(formatMinutes(125 * 60)).toBe('125 min');
  });

  it('rounds to the nearest minute', () => {
    expect(formatMinutes(62 * 60 + 29)).toBe('62 min');
    expect(formatMinutes(62 * 60 + 30)).toBe('63 min');
  });

  it('never calls a session that ran "0 min"', () => {
    expect(formatMinutes(20)).toBe('1 min');
  });

  it('reads nothing as 0, and never as negative', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(-30)).toBe('0 min');
  });
});
