import { act } from '@testing-library/react-native';

import type { ISODate } from '@/shared/lib/date/isoDate';

import { useSelectedDayStore } from '../selectedDayStore';

const SEPT_30 = '2026-09-30' as ISODate;
const OCT_1 = '2026-10-01' as ISODate;

beforeEach(() => act(() => useSelectedDayStore.setState({ day: null })));

describe('the selected day', () => {
  it('is the day whose sheet is open', () => {
    act(() => useSelectedDayStore.getState().select(SEPT_30));

    expect(useSelectedDayStore.getState().day).toBe(SEPT_30);
  });

  it('clears when that sheet closes', () => {
    act(() => useSelectedDayStore.getState().select(SEPT_30));
    act(() => useSelectedDayStore.getState().release(SEPT_30));

    expect(useSelectedDayStore.getState().day).toBeNull();
  });

  it("is not cleared by a closing sheet once another day's sheet has taken over", () => {
    act(() => useSelectedDayStore.getState().select(SEPT_30));
    act(() => useSelectedDayStore.getState().select(OCT_1));
    act(() => useSelectedDayStore.getState().release(SEPT_30));

    expect(useSelectedDayStore.getState().day).toBe(OCT_1);
  });
});
