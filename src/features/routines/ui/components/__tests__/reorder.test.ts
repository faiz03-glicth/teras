import { dropIndex, dropOffset, shiftFor } from '../reorder';

// Four rows: 50, 80 (an open editor), 50 and 50 pt tall.
const HEIGHTS = [50, 80, 50, 50];

describe('dropIndex', () => {
  it('stays in place until the dragged row has passed the middle of the next one', () => {
    expect(dropIndex(HEIGHTS, 0, 0)).toBe(0);
    // Row 0's middle (25) moved 60 to 85: still above row 1's middle (90).
    expect(dropIndex(HEIGHTS, 0, 60)).toBe(0);
    expect(dropIndex(HEIGHTS, 0, 70)).toBe(1);
  });

  it('lands past every row whose middle it passed, up or down, and never past an end', () => {
    expect(dropIndex(HEIGHTS, 0, 160)).toBe(2);
    expect(dropIndex(HEIGHTS, 0, 1000)).toBe(3);
    expect(dropIndex(HEIGHTS, 3, -60)).toBe(2);
    expect(dropIndex(HEIGHTS, 3, -1000)).toBe(0);
  });
});

describe('dropOffset', () => {
  it('is the height of the rows passed: down is positive, up negative', () => {
    expect(dropOffset(HEIGHTS, 0, 2)).toBe(130);
    expect(dropOffset(HEIGHTS, 3, 1)).toBe(-130);
    expect(dropOffset(HEIGHTS, 2, 2)).toBe(0);
  });
});

describe('shiftFor', () => {
  it('moves the rows between where the dragged one was and where it would land, by its height', () => {
    // Row 0 (50 pt) hovering at place 2: rows 1 and 2 move up into its room; row 3 stays.
    expect(shiftFor(1, 0, 2, 50)).toBe(-50);
    expect(shiftFor(2, 0, 2, 50)).toBe(-50);
    expect(shiftFor(3, 0, 2, 50)).toBe(0);
    // Row 3 hovering at place 1: rows 1 and 2 move down.
    expect(shiftFor(1, 3, 1, 50)).toBe(50);
    expect(shiftFor(2, 3, 1, 50)).toBe(50);
    expect(shiftFor(0, 3, 1, 50)).toBe(0);
  });
});
