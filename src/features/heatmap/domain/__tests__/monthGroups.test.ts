import type { ISODate } from '@/shared/lib/date/isoDate';

import { groupByMonth } from '../monthGroups';

const item = (id: string, date: string) => ({ id, date: date as ISODate });

describe('groupByMonth', () => {
  it('gathers dated items by calendar month, newest month first, keeping their order', () => {
    const groups = groupByMonth([
      item('a', '2026-09-30'),
      item('b', '2026-09-27'),
      item('c', '2026-08-31'),
      item('d', '2026-07-02'),
    ]);

    expect(groups.map((group) => group.month)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
      { year: 2026, month: 6 },
    ]);
    expect(groups.map((group) => group.items.map((entry) => entry.id))).toEqual([['a', 'b'], ['c'], ['d']]);
  });

  it('keeps the same month of different years apart', () => {
    const groups = groupByMonth([item('a', '2026-09-01'), item('b', '2025-09-01')]);

    expect(groups).toHaveLength(2);
  });

  it('is empty for no items', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
