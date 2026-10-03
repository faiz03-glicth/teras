import type { ExerciseType } from '@/core/db/schema';

/** One exercise of a routine being edited. `key` stays with it as it moves, so rows keep their place. */
export interface RoutineDraftItem {
  key: string;
  exerciseId: string;
  targetSets: number;
  /** For weighted and bodyweight exercises; null for a held one. */
  targetReps: number | null;
  /** For a held (timed) exercise; null otherwise. */
  targetSeconds: number | null;
  /** Fills the first workout from it; after that, the last performance does. */
  startWeightKg: number | null;
}

/** A routine as it is being edited: nothing is saved until Save. A new one has no id yet. */
export interface RoutineDraft {
  routineId: string | null;
  name: string;
  items: readonly RoutineDraftItem[];
}

/** What an exercise added to a routine asks for, until it is changed while training. */
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_SECONDS = 60;

/** PURE: the items with an exercise added at the end, at the default targets for how it is measured. */
export function addItem(
  items: readonly RoutineDraftItem[],
  { key, exerciseId, type }: { key: string; exerciseId: string; type: ExerciseType },
): RoutineDraftItem[] {
  const timed = type === 'timed';
  return [
    ...items,
    {
      key,
      exerciseId,
      targetSets: DEFAULT_SETS,
      targetReps: timed ? null : DEFAULT_REPS,
      targetSeconds: timed ? DEFAULT_SECONDS : null,
      startWeightKg: null,
    },
  ];
}

/** PURE: the items with one moved a place up (−1) or down (+1); the same items when it is at that end. */
export function moveItem(
  items: readonly RoutineDraftItem[],
  key: string,
  direction: -1 | 1,
): readonly RoutineDraftItem[] {
  const from = items.findIndex((one) => one.key === key);
  const to = from + direction;
  const moving = items[from];
  const other = items[to];
  if (from < 0 || !moving || !other) return items;
  return items.map((one, index) => (index === from ? other : index === to ? moving : one));
}

/** PURE: the items without the one keyed `key`. */
export function removeItem(items: readonly RoutineDraftItem[], key: string): RoutineDraftItem[] {
  return items.filter((one) => one.key !== key);
}

export type RoutineNameCheck = { ok: true; name: string } | { ok: false; reason: string };

/** PURE: the name a routine is saved under, trimmed and with single spaces; a blank one is refused. */
export function checkRoutineName(typed: string): RoutineNameCheck {
  const name = typed.trim().replace(/\s+/g, ' ');
  return name === '' ? { ok: false, reason: 'Give the routine a name' } : { ok: true, name };
}

/** PURE: whether the draft differs from what was saved: its name, or its exercises, targets and order. */
export function draftChanged(saved: RoutineDraft, draft: RoutineDraft): boolean {
  if (saved.name !== draft.name || saved.items.length !== draft.items.length) return true;
  return draft.items.some((one, index) => {
    const before = saved.items[index];
    return (
      !before ||
      before.key !== one.key ||
      before.targetSets !== one.targetSets ||
      before.targetReps !== one.targetReps ||
      before.targetSeconds !== one.targetSeconds
    );
  });
}

const count = (value: number, word: string) => `${value} ${word}${value === 1 ? '' : 's'}`;

/** PURE: what the routine asks of an exercise: "3 sets × 10 reps", or "3 sets × 60 s" when held. */
export function targetLine(item: RoutineDraftItem): string {
  const each = item.targetSeconds !== null ? `${item.targetSeconds} s` : count(item.targetReps ?? 0, 'rep');
  return `${count(item.targetSets, 'set')} × ${each}`;
}
