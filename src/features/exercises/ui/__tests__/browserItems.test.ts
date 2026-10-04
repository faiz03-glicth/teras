import { itemKey, itemKind, type BrowserItem } from '../useExerciseBrowser';

describe("the browser list's keys and kinds", () => {
  const heading: BrowserItem = { kind: 'group', key: 'group-all-chest', title: 'Chest', place: 'first' };

  it("are each item's own", () => {
    expect(itemKey(heading, 3)).toBe('group-all-chest');
    expect(itemKind(heading)).toBe('group');
  });

  it('answer for a row past the end of the list, which FlashList 2.0.2 can ask about for a render', () => {
    expect(itemKey(undefined, 9)).toBe('gone-9');
    expect(itemKind(undefined)).toBe('row');
  });
});
