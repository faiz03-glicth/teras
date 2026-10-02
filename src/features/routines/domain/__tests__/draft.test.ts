import {
  addItem,
  checkRoutineName,
  draftChanged,
  moveItem,
  removeItem,
  targetLine,
  type RoutineDraft,
  type RoutineDraftItem,
} from '../draft';

const item = (key: string, exerciseId: string, over: Partial<RoutineDraftItem> = {}): RoutineDraftItem => ({
  key,
  exerciseId,
  targetSets: 3,
  targetReps: 10,
  targetSeconds: null,
  startWeightKg: null,
  ...over,
});

const keys = (items: readonly RoutineDraftItem[]) => items.map((one) => one.key);

describe('addItem', () => {
  it('adds an exercise at the end: three sets of ten, or of a minute when it is held', () => {
    const items = addItem(addItem([], { key: 'a', exerciseId: 'bench', type: 'weighted' }), {
      key: 'b',
      exerciseId: 'plank',
      type: 'timed',
    });

    expect(items).toEqual([item('a', 'bench'), item('b', 'plank', { targetReps: null, targetSeconds: 60 })]);
  });
});

describe('moveItem', () => {
  const items = [item('a', 'x'), item('b', 'y'), item('c', 'z')];

  it('moves one a place up or down', () => {
    expect(keys(moveItem(items, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(keys(moveItem(items, 'b', 1))).toEqual(['a', 'c', 'b']);
  });

  it('goes no further than either end', () => {
    expect(moveItem(items, 'a', -1)).toBe(items);
    expect(moveItem(items, 'c', 1)).toBe(items);
  });
});

describe('removeItem', () => {
  it('takes out the one asked for, and only that one', () => {
    const items = [item('a', 'bench'), item('b', 'bench')];

    expect(keys(removeItem(items, 'a'))).toEqual(['b']);
  });
});

describe('checkRoutineName', () => {
  it('tidies the name, and asks for one when there is none', () => {
    expect(checkRoutineName('  Push   Day ')).toEqual({ ok: true, name: 'Push Day' });
    expect(checkRoutineName('   ')).toEqual({ ok: false, reason: 'Give the routine a name' });
  });
});

describe('draftChanged', () => {
  const saved: RoutineDraft = { routineId: 'r1', name: 'Push Day', items: [item('a', 'x'), item('b', 'y')] };

  it('is false for the routine as it was', () => {
    expect(draftChanged(saved, { ...saved, items: [...saved.items] })).toBe(false);
  });

  it('notices a new name, and an exercise added, taken out or moved', () => {
    expect(draftChanged(saved, { ...saved, name: 'Push' })).toBe(true);
    expect(draftChanged(saved, { ...saved, items: [...saved.items, item('c', 'z')] })).toBe(true);
    expect(draftChanged(saved, { ...saved, items: removeItem(saved.items, 'a') })).toBe(true);
    expect(draftChanged(saved, { ...saved, items: moveItem(saved.items, 'b', -1) })).toBe(true);
  });
});

describe('targetLine', () => {
  it('says what the routine asks of an exercise', () => {
    expect(targetLine(item('a', 'bench', { targetSets: 4, targetReps: 8 }))).toBe('4 sets × 8 reps');
    expect(targetLine(item('b', 'plank', { targetReps: null, targetSeconds: 45 }))).toBe('3 sets × 45 s');
    expect(targetLine(item('c', 'curl', { targetSets: 1, targetReps: 1 }))).toBe('1 set × 1 rep');
  });
});
