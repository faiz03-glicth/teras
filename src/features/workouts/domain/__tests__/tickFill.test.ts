import { tickFill } from '../tickFill';

const empty = { weightKg: null, reps: null, seconds: null };
const set = (weightKg: number | null, reps: number | null, seconds: number | null = null) => ({
  weightKg,
  reps,
  seconds,
});

describe('tickFill', () => {
  it('fills an empty set from the set above it', () => {
    expect(tickFill(empty, set(60, 8), set(55, 10))).toEqual(set(60, 8));
  });

  it("fills an exercise's first set from last time's first set", () => {
    expect(tickFill(empty, undefined, set(55, 10))).toEqual(set(55, 10));
  });

  it('looks past an empty set above to last time', () => {
    expect(tickFill(empty, empty, set(55, 10))).toEqual(set(55, 10));
  });

  it('refuses (null) when there is nothing above and no last time', () => {
    expect(tickFill(empty, undefined, undefined)).toBeNull();
    expect(tickFill(empty, empty, undefined)).toBeNull();
    expect(tickFill(empty, empty, empty)).toBeNull();
  });

  it('never touches a set with anything typed in', () => {
    // A bodyweight set with reps and no kg means nothing added: it must stay that way.
    expect(tickFill(set(null, 12), set(10, 8), undefined)).toEqual({});
    expect(tickFill(set(60, null), set(60, 8), undefined)).toEqual({});
  });

  it('copies the set whole, a bodyweight one with no added weight and a hold too', () => {
    expect(tickFill(empty, set(null, 12), undefined)).toEqual(set(null, 12));
    expect(tickFill(empty, set(null, null, 75), undefined)).toEqual(set(null, null, 75));
  });
});
