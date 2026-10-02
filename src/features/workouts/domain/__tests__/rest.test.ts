import { adjustRest, REST_STEP_SECONDS, restClock, restLeft } from '../rest';

const NOW = Date.UTC(2026, 9, 2, 18, 0, 0);
const at = (secondsFromNow: number) => new Date(NOW + secondsFromNow * 1000).toISOString();

describe('restLeft', () => {
  it('is the whole seconds still to wait, rounded up', () => {
    expect(restLeft(at(90), NOW)).toBe(90);
    expect(restLeft(new Date(NOW + 89_200).toISOString(), NOW)).toBe(90);
  });

  it('is zero once the rest is over, and with no rest running', () => {
    expect(restLeft(at(-5), NOW)).toBe(0);
    expect(restLeft(null, NOW)).toBe(0);
  });
});

describe('adjustRest', () => {
  it('moves the end by 15 seconds either way', () => {
    expect(REST_STEP_SECONDS).toBe(15);
    expect(adjustRest(at(60), 1, NOW)).toBe(at(75));
    expect(adjustRest(at(60), -1, NOW)).toBe(at(45));
  });

  it('ends the rest rather than going below nothing', () => {
    expect(adjustRest(at(10), -1, NOW)).toBeNull();
  });

  it('has nothing to move with no rest running', () => {
    expect(adjustRest(null, 1, NOW)).toBeNull();
  });
});

describe('restClock', () => {
  it('reads as a clock: "1:30", "0:05"', () => {
    expect(restClock(90)).toBe('1:30');
    expect(restClock(5)).toBe('0:05');
    expect(restClock(0)).toBe('0:00');
  });
});
