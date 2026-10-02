/**
 * The item at `index`, or a failure naming what was missing. `noUncheckedIndexedAccess` makes every
 * index access `T | undefined`, and a test that indexes into a result wants to fail loudly when the
 * result is shorter than it expected — not to litter assertions with optional chaining.
 */
export function at<T>(list: readonly T[], index: number, what = 'item'): T {
  const item = list[index];
  if (item === undefined) throw new Error(`Expected a ${what} at index ${index}, got ${list.length}`);
  return item;
}

/** The first item, or a failure. */
export const first = <T>(list: readonly T[], what = 'item'): T => at(list, 0, what);
