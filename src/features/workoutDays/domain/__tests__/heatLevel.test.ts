import { heatLevel, quantile } from '../heatLevel';

// Ten earlier training days: quartiles are 6,200 / 7,200 / 8,600 kg.
const WINDOW = [4000, 5200, 6100, 6500, 7000, 7400, 8000, 8800, 9500, 11000];

describe('quantile', () => {
  it('interpolates between neighbours', () => {
    expect(quantile(WINDOW, 0.25)).toBeCloseTo(6200);
    expect(quantile(WINDOW, 0.5)).toBeCloseTo(7200);
    expect(quantile(WINDOW, 0.75)).toBeCloseTo(8600);
  });

  it('is the only value of a one-item list', () => {
    expect(quantile([500], 0.5)).toBe(500);
  });
});

describe('heatLevel', () => {
  it('is 0 without a completed set, whatever the volume', () => {
    expect(heatLevel({ sets: 0, volumeKg: 0 }, WINDOW)).toBe(0);
    expect(heatLevel({ sets: 0, volumeKg: 9000 }, WINDOW)).toBe(0);
  });

  it('is 1 for a day with sets but no volume (planks only): a day you trained is never empty', () => {
    expect(heatLevel({ sets: 3, volumeKg: 0 }, WINDOW)).toBe(1);
    expect(heatLevel({ sets: 3, volumeKg: 0 }, [])).toBe(1);
  });

  it('is 2 until there are five earlier training days to judge against', () => {
    expect(heatLevel({ sets: 12, volumeKg: 9000 }, [])).toBe(2);
    expect(heatLevel({ sets: 12, volumeKg: 100 }, [4000, 5000, 6000, 7000])).toBe(2);
  });

  it('then ranks the day by quartile of the earlier days', () => {
    const level = (volumeKg: number) => heatLevel({ sets: 12, volumeKg }, WINDOW);
    expect(level(6199)).toBe(1);
    expect(level(6200)).toBe(2);
    expect(level(7199)).toBe(2);
    expect(level(7200)).toBe(3);
    expect(level(8200)).toBe(3);
    expect(level(8600)).toBe(4);
    expect(level(20000)).toBe(4);
  });

  it('does not depend on the order the earlier days are given in', () => {
    const shuffled = [8800, 4000, 11000, 6500, 7400, 5200, 9500, 6100, 8000, 7000];
    expect(heatLevel({ sets: 12, volumeKg: 8200 }, shuffled)).toBe(3);
  });
});
