import type { ExerciseType } from '@/core/db/schema';
import { LB_PER_KG, type StepDirection, type WeightUnit } from '@/features/training/domain/preferences';

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

/**
 * PURE: the items with one moved to place `to` (0 = first; past either end means that end), the rest
 * closing up around it. The same items when it stays put or isn't there; every other item keeps its object.
 */
export function moveItemTo(
  items: readonly RoutineDraftItem[],
  key: string,
  to: number,
): readonly RoutineDraftItem[] {
  const from = items.findIndex((one) => one.key === key);
  const moving = items[from];
  const place = Math.min(Math.max(Math.round(to), 0), items.length - 1);
  if (from < 0 || !moving || place === from) return items;
  const rest = items.filter((one) => one.key !== key);
  return [...rest.slice(0, place), moving, ...rest.slice(place)];
}

/** What can be changed about one exercise of a routine. */
export type TargetChange = Partial<
  Pick<RoutineDraftItem, 'targetSets' | 'targetReps' | 'targetSeconds' | 'startWeightKg'>
>;

const sameTargets = (a: RoutineDraftItem, b: RoutineDraftItem) =>
  a.targetSets === b.targetSets &&
  a.targetReps === b.targetReps &&
  a.targetSeconds === b.targetSeconds &&
  a.startWeightKg === b.startWeightKg;

/**
 * PURE: the items with one item's targets changed. The same items when nothing changes or the key isn't
 * there, and every other item keeps its object, so only the row that changed is drawn again.
 */
export function updateItem(
  items: readonly RoutineDraftItem[],
  key: string,
  change: TargetChange,
): readonly RoutineDraftItem[] {
  const at = items.findIndex((one) => one.key === key);
  const before = items[at];
  if (!before) return items;
  const after = { ...before, ...change };
  if (sameTargets(before, after)) return items;
  return items.map((one, index) => (index === at ? after : one));
}

/** How far each target can go. A starting weight has no minimum: below the first step it is none. */
export const TARGET_LIMITS = {
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 100 },
  seconds: { min: 5, max: 600, step: 5 },
  startWeightKg: { max: 500 },
} as const;

/** One tap of the starting-weight stepper, in the unit shown. */
const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** PURE: one tap of a sets or reps stepper: one more or fewer, within `limits`. */
export function stepCount(
  value: number,
  direction: StepDirection,
  limits: { min: number; max: number },
): number {
  return clamp(value + direction, limits.min, limits.max);
}

/** PURE: one tap of a held exercise's stepper: five seconds, landing on a step, within the limits. */
export function stepSeconds(value: number, direction: StepDirection): number {
  const { min, max, step } = TARGET_LIMITS.seconds;
  const landed = direction > 0 ? Math.floor(value / step) + 1 : Math.ceil(value / step) - 1;
  return clamp(landed * step, min, max);
}

/**
 * PURE: one tap of the starting-weight stepper: 2.5 kg, or 5 lb when pounds are shown, landing on a step.
 * From none it starts at the first step; below the first step it goes back to none. Stored in kilograms.
 */
export function stepStartWeight(
  kg: number | null,
  direction: StepDirection,
  unit: WeightUnit,
): number | null {
  const step = WEIGHT_STEP[unit];
  const perKg = unit === 'kg' ? 1 : LB_PER_KG;
  const shown = (kg ?? 0) * perKg;
  const steps = direction > 0 ? Math.floor(shown / step + 1e-9) + 1 : Math.ceil(shown / step - 1e-9) - 1;
  if (steps <= 0) return null;
  return Math.min((steps * step) / perKg, TARGET_LIMITS.startWeightKg.max);
}

/** PURE: a typed set or rep count: a whole number within `limits`, or nothing. */
export function parseTargetCount(text: string, limits: { min: number; max: number }): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= limits.min && value <= limits.max ? value : null;
}

/** A typed starting weight: kilograms, none (`kg: null`, typed blank or 0), or not a weight. */
export type StartWeightParse = { ok: true; kg: number | null } | { ok: false };

/** PURE: a typed starting weight in the unit shown. A comma is a point; blank or 0 means none. */
export function parseStartWeight(text: string, unit: WeightUnit): StartWeightParse {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return { ok: true, kg: null };
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') return { ok: false };
  const kg = Number(trimmed) / (unit === 'kg' ? 1 : LB_PER_KG);
  if (kg > TARGET_LIMITS.startWeightKg.max) return { ok: false };
  return { ok: true, kg: kg === 0 ? null : kg };
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
      before.targetSeconds !== one.targetSeconds ||
      before.startWeightKg !== one.startWeightKg
    );
  });
}

const count = (value: number, word: string) => `${value} ${word}${value === 1 ? '' : 's'}`;

/** PURE: what the routine asks of an exercise: "3 sets × 10 reps", or "3 sets × 60 s" when held. */
export function targetLine(item: RoutineDraftItem): string {
  const each = item.targetSeconds !== null ? `${item.targetSeconds} s` : count(item.targetReps ?? 0, 'rep');
  return `${count(item.targetSets, 'set')} × ${each}`;
}
