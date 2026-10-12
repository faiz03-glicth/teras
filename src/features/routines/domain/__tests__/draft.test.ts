import {
  addItem,
  checkRoutineName,
  draftChanged,
  moveItem,
  moveItemTo,
  parseTargetCount,
  parseStartWeight,
  removeItem,
  stepCount,
  stepSeconds,
  stepStartWeight,
  TARGET_LIMITS,
  targetLine,
  updateItem,
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

  it('notices a target or the starting weight changed', () => {
    expect(draftChanged(saved, { ...saved, items: updateItem(saved.items, 'a', { targetSets: 4 }) })).toBe(
      true,
    );
    expect(draftChanged(saved, { ...saved, items: updateItem(saved.items, 'b', { targetReps: 8 }) })).toBe(
      true,
    );
    expect(
      draftChanged(saved, { ...saved, items: updateItem(saved.items, 'a', { startWeightKg: 40 }) }),
    ).toBe(true);
  });
});

describe('moveItemTo', () => {
  const items = [item('a', 'x'), item('b', 'y'), item('c', 'z'), item('d', 'w')];

  it('moves one to any place, the others closing up around it', () => {
    expect(keys(moveItemTo(items, 'a', 2))).toEqual(['b', 'c', 'a', 'd']);
    expect(keys(moveItemTo(items, 'd', 0))).toEqual(['d', 'a', 'b', 'c']);
    expect(keys(moveItemTo(items, 'b', 3))).toEqual(['a', 'c', 'd', 'b']);
  });

  it('keeps the same items when it stays where it is, the key is unknown, or the place is past an end', () => {
    expect(moveItemTo(items, 'b', 1)).toBe(items);
    expect(moveItemTo(items, 'nope', 0)).toBe(items);
    expect(keys(moveItemTo(items, 'a', 99))).toEqual(['b', 'c', 'd', 'a']);
    expect(keys(moveItemTo(items, 'c', -5))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('leaves every other item the same object, so rows that did not change are not redrawn', () => {
    const moved = moveItemTo(items, 'a', 2);
    expect(moved.find((one) => one.key === 'd')).toBe(items[3]);
  });
});

describe('updateItem', () => {
  const items = [item('a', 'x'), item('b', 'y')];

  it('changes one item and keeps every other item the same object', () => {
    const next = updateItem(items, 'a', { targetSets: 5, startWeightKg: 60 });
    expect(next[0]).toEqual(item('a', 'x', { targetSets: 5, startWeightKg: 60 }));
    expect(next[1]).toBe(items[1]);
  });

  it('keeps the same items when nothing changes or the key is unknown', () => {
    expect(updateItem(items, 'a', { targetSets: 3 })).toBe(items);
    expect(updateItem(items, 'nope', { targetSets: 9 })).toBe(items);
  });
});

describe('stepCount', () => {
  it('steps sets and reps by one, within their limits', () => {
    expect(stepCount(3, 1, TARGET_LIMITS.sets)).toBe(4);
    expect(stepCount(1, -1, TARGET_LIMITS.sets)).toBe(1);
    expect(stepCount(TARGET_LIMITS.sets.max, 1, TARGET_LIMITS.sets)).toBe(TARGET_LIMITS.sets.max);
    expect(stepCount(10, -1, TARGET_LIMITS.reps)).toBe(9);
    expect(stepCount(TARGET_LIMITS.reps.max, 1, TARGET_LIMITS.reps)).toBe(TARGET_LIMITS.reps.max);
  });
});

describe('stepSeconds', () => {
  it('steps a held exercise by five seconds, within its limits, landing on a step', () => {
    expect(stepSeconds(60, 1)).toBe(65);
    expect(stepSeconds(62, -1)).toBe(60);
    expect(stepSeconds(60, -1)).toBe(55);
    expect(stepSeconds(TARGET_LIMITS.seconds.min, -1)).toBe(TARGET_LIMITS.seconds.min);
    expect(stepSeconds(TARGET_LIMITS.seconds.max, 1)).toBe(TARGET_LIMITS.seconds.max);
  });
});

describe('stepStartWeight', () => {
  it('steps 2.5 kg, starting from none and going back to none below the first step', () => {
    expect(stepStartWeight(null, 1, 'kg')).toBe(2.5);
    expect(stepStartWeight(40, 1, 'kg')).toBe(42.5);
    expect(stepStartWeight(41, -1, 'kg')).toBe(40);
    expect(stepStartWeight(40, -1, 'kg')).toBe(37.5);
    expect(stepStartWeight(2.5, -1, 'kg')).toBeNull();
    expect(stepStartWeight(null, -1, 'kg')).toBeNull();
  });

  it('steps 5 lb when pounds are shown, stored in kilograms', () => {
    expect(stepStartWeight(null, 1, 'lb')).toBeCloseTo(5 / 2.20462, 6);
    // 40 kg shows as 88.2 lb: the step lands on 90 lb.
    expect(stepStartWeight(40, 1, 'lb')).toBeCloseTo(90 / 2.20462, 6);
  });

  it('stops at the most a routine can start from', () => {
    expect(stepStartWeight(TARGET_LIMITS.startWeightKg.max, 1, 'kg')).toBe(TARGET_LIMITS.startWeightKg.max);
  });
});

describe('parseTargetCount', () => {
  it('reads a whole number within the limits, and nothing for anything else', () => {
    expect(parseTargetCount('12', TARGET_LIMITS.reps)).toBe(12);
    expect(parseTargetCount(' 4 ', TARGET_LIMITS.sets)).toBe(4);
    expect(parseTargetCount('0', TARGET_LIMITS.sets)).toBeNull();
    expect(parseTargetCount('2.5', TARGET_LIMITS.reps)).toBeNull();
    expect(parseTargetCount('', TARGET_LIMITS.reps)).toBeNull();
    expect(parseTargetCount('500', TARGET_LIMITS.reps)).toBeNull();
  });
});

describe('parseStartWeight', () => {
  it('reads a weight in the unit shown, blank meaning none', () => {
    expect(parseStartWeight('60', 'kg')).toEqual({ ok: true, kg: 60 });
    expect(parseStartWeight('62,5', 'kg')).toEqual({ ok: true, kg: 62.5 });
    expect(parseStartWeight('', 'kg')).toEqual({ ok: true, kg: null });
    const lb = parseStartWeight('135', 'lb');
    expect(lb.ok && lb.kg).toBeCloseTo(135 / 2.20462, 6);
  });

  it('refuses what is not a weight, or more than a routine can start from', () => {
    expect(parseStartWeight('abc', 'kg')).toEqual({ ok: false });
    expect(parseStartWeight('-5', 'kg')).toEqual({ ok: false });
    expect(parseStartWeight('9999', 'kg')).toEqual({ ok: false });
  });
});

describe('targetLine', () => {
  it('says what the routine asks of an exercise', () => {
    expect(targetLine(item('a', 'bench', { targetSets: 4, targetReps: 8 }))).toBe('4 sets × 8 reps');
    expect(targetLine(item('b', 'plank', { targetReps: null, targetSeconds: 45 }))).toBe('3 sets × 45 s');
    expect(targetLine(item('c', 'curl', { targetSets: 1, targetReps: 1 }))).toBe('1 set × 1 rep');
  });
});
