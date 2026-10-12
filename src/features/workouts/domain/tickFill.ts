import type { PreviousSet } from './setUnits';

/** A set's values: weight (the added weight on a bodyweight lift), reps, and a hold's seconds. */
export type SetValues = PreviousSet;

/** PURE: nothing typed in: no weight, no reps, no time. */
export const isEmptySet = (set: SetValues) =>
  set.weightKg === null && set.reps === null && set.seconds === null;

/**
 * PURE: what ticking a set fills in (owner, 12 Oct, S21). Only a set with nothing typed in is filled, and
 * then wholly, from the set right above it in the same exercise; the first set (or one under an empty set)
 * takes last time's set of the same number, what its Previous column shows. With neither it is null: the
 * tick is refused (owner, 12 Oct), so an empty set never counts, lights a day or reaches Streak. A set with
 * any value typed is never touched: on a bodyweight lift an empty kg means nothing added, so filling
 * single fields would invent weight.
 */
export function tickFill(
  set: SetValues,
  above: SetValues | undefined,
  lastTime: SetValues | undefined,
): Partial<SetValues> | null {
  if (!isEmptySet(set)) return {};
  const source = [above, lastTime].find((one) => one && !isEmptySet(one));
  if (!source) return null;
  return { weightKg: source.weightKg, reps: source.reps, seconds: source.seconds };
}

/** A tick refused: the set has nothing typed in and nothing to copy (tickFill gave null). */
export class NothingToTickError extends Error {
  constructor(setId: string) {
    super(`Set ${setId} has nothing to tick`);
    this.name = 'NothingToTickError';
  }
}
