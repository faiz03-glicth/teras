/**
 * The arithmetic of dragging one row of a list to a new place, on the UI thread. `heights` are the rows'
 * heights in their current order (each with the divider below it); `from` is the dragged row's place.
 */

/** PURE worklet: the place a row dragged `dy` pt from `from` would land: past every row whose middle it passed. */
export function dropIndex(heights: readonly number[], from: number, dy: number): number {
  'worklet';
  let top = 0;
  for (let i = 0; i < from; i += 1) top += heights[i] ?? 0;
  const middle = top + dy + (heights[from] ?? 0) / 2;
  let y = 0;
  let place = 0;
  for (let i = 0; i < heights.length; i += 1) {
    const height = heights[i] ?? 0;
    if (i !== from && y + height / 2 < middle) place += 1;
    y += height;
  }
  return place;
}

/** PURE worklet: how far the dragged row travels to sit at place `to`: the heights of the rows it passes. */
export function dropOffset(heights: readonly number[], from: number, to: number): number {
  'worklet';
  let offset = 0;
  for (let i = from + 1; i <= to; i += 1) offset += heights[i] ?? 0;
  for (let i = to; i < from; i += 1) offset -= heights[i] ?? 0;
  return offset;
}

/**
 * PURE worklet: how far the row at `index` moves aside while the row from `from` (`height` pt) hovers at
 * `to`: the rows in between close up into the dragged row's room.
 */
export function shiftFor(index: number, from: number, to: number, height: number): number {
  'worklet';
  if (from < index && index <= to) return -height;
  if (to <= index && index < from) return height;
  return 0;
}
