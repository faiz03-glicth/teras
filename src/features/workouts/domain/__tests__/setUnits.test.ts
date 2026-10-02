import { parseSetWeight, previousText, setWeightText, weightColumn } from '../setUnits';

describe('setWeightText', () => {
  it('shows a stored weight in the unit chosen, without a trailing ".0"', () => {
    expect(setWeightText(60, 'kg')).toBe('60');
    expect(setWeightText(62.5, 'kg')).toBe('62.5');
    expect(setWeightText(61.23497, 'lb')).toBe('135');
  });

  it('is blank for a weight not recorded yet', () => {
    expect(setWeightText(null, 'kg')).toBe('');
    expect(setWeightText(null, 'lb')).toBe('');
  });
});

describe('parseSetWeight', () => {
  it('stores what is typed in kilograms, unrounded', () => {
    expect(parseSetWeight('60', 'kg')).toBe(60);
    expect(parseSetWeight('135', 'lb')).toBeCloseTo(61.235, 3);
  });

  it('round-trips: a pound weight typed and shown back reads the same', () => {
    const stored = parseSetWeight('225', 'lb');
    expect(stored).not.toBeNull();
    expect(setWeightText(stored, 'lb')).toBe('225');
  });

  it('reads a comma as the decimal point', () => {
    expect(parseSetWeight('62,5', 'kg')).toBe(62.5);
  });

  it('reads a blank or a non-number as "not recorded", never zero', () => {
    expect(parseSetWeight('', 'kg')).toBeNull();
    expect(parseSetWeight('abc', 'lb')).toBeNull();
  });
});

describe('weightColumn', () => {
  it('names the weight column in the unit chosen', () => {
    expect(weightColumn('weighted', 'kg')).toBe('kg');
    expect(weightColumn('weighted', 'lb')).toBe('lb');
  });

  it('is added weight for a bodyweight exercise', () => {
    expect(weightColumn('bodyweight', 'kg')).toBe('+kg');
    expect(weightColumn('bodyweight', 'lb')).toBe('+lb');
  });
});

describe('previousText', () => {
  const last = (values: { weightKg?: number; reps?: number; seconds?: number }) => ({
    weightKg: values.weightKg ?? null,
    reps: values.reps ?? null,
    seconds: values.seconds ?? null,
  });

  it('reads a set from last time briefly, in the unit chosen', () => {
    expect(previousText(last({ weightKg: 60, reps: 8 }), 'weighted', 'kg')).toBe('60kg × 8');
    expect(previousText(last({ weightKg: 61.23497, reps: 8 }), 'weighted', 'lb')).toBe('135lb × 8');
  });

  it('shows the weight added for a bodyweight set, and the hold for a timed one', () => {
    expect(previousText(last({ weightKg: 10, reps: 8 }), 'bodyweight', 'kg')).toBe('+10kg × 8');
    expect(previousText(last({ reps: 12 }), 'bodyweight', 'kg')).toBe('× 12');
    expect(previousText(last({ seconds: 75 }), 'timed', 'kg')).toBe('1:15');
  });

  it('is a dash where there was no set last time', () => {
    expect(previousText(undefined, 'weighted', 'kg')).toBe('—');
  });
});
