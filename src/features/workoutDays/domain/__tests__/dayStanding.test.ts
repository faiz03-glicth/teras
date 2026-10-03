import { dayStanding, heatLevel } from '../heatLevel';

// Ten earlier training days: the median is 7,200 kg.
const WINDOW = [4000, 5200, 6100, 6500, 7000, 7400, 8000, 8800, 9500, 11000];

describe('dayStanding', () => {
  it('is a rest day without a completed set, or without a row at all', () => {
    expect(dayStanding({ sets: 0, volumeKg: 0 }, WINDOW)).toEqual({ kind: 'rest' });
    expect(dayStanding(null, WINDOW)).toEqual({ kind: 'rest' });
  });

  it('counts the sets of a day that moved no weight (planks only)', () => {
    expect(dayStanding({ sets: 3, volumeKg: 0 }, WINDOW)).toEqual({ kind: 'unweighted', sets: 3 });
  });

  it('has nothing to compare with before five earlier training days', () => {
    expect(dayStanding({ sets: 12, volumeKg: 4820 }, [3900, 4100])).toEqual({
      kind: 'early',
      volumeKg: 4820,
    });
  });

  it('is shown against the median of the 90 days before it', () => {
    expect(dayStanding({ sets: 12, volumeKg: 8200 }, WINDOW)).toEqual({
      kind: 'compared',
      volumeKg: 8200,
      medianKg: 7200,
    });
  });

  it('agrees with the level rule about which days were judged by comparison', () => {
    // Below five earlier days the level is the fixed "Moderate", so there is nothing to compare with.
    const early = [4000, 5000, 6000, 7000];
    expect(heatLevel({ sets: 12, volumeKg: 100 }, early)).toBe(2);
    expect(dayStanding({ sets: 12, volumeKg: 100 }, early).kind).toBe('early');
    expect(dayStanding({ sets: 12, volumeKg: 100 }, [...early, 8000]).kind).toBe('compared');
  });
});
