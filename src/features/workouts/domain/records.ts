import type { ExerciseType, SetStatus, SetType } from '@/core/db/schema';
import { formatRest, formatWeight, type WeightUnit } from '@/features/training/domain/preferences';

/** A set as far as records go: whether it counts, and what it measured. */
export interface RecordSet {
  status: SetStatus;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/**
 * The best of each measure across some sets. Only completed sets that are not warm-ups count, and a
 * weight counts only when it was lifted at least once. The DAO's `bests` applies the same rule
 * in SQL, over a whole history at once.
 */
export interface SetBests {
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/** A personal record: an exercise, and the best a workout beat every earlier one with. */
export interface PersonalRecord {
  exerciseId: string;
  name: string;
  type: ExerciseType;
  /** Kilograms, reps or seconds, as the exercise's type is measured. */
  value: number;
}

const NO_BESTS: SetBests = { weightKg: null, reps: null, seconds: null };

const larger = (best: number | null, value: number | null): number | null =>
  value === null ? best : best === null ? value : Math.max(best, value);

/** PURE: the bests of the sets that count: completed, not warm-ups. */
export function setBests(sets: readonly RecordSet[]): SetBests {
  return sets
    .filter((set) => set.status === 'done' && set.setType !== 'warmup')
    .reduce<SetBests>(
      (bests, set) => ({
        weightKg: (set.reps ?? 0) > 0 ? larger(bests.weightKg, set.weightKg) : bests.weightKg,
        reps: larger(bests.reps, set.reps),
        seconds: larger(bests.seconds, set.seconds),
      }),
      NO_BESTS,
    );
}

/** PURE: the one number a record is: heaviest weight, most reps or longest hold, by type. 0 for none. */
export function recordValue(type: ExerciseType, bests: SetBests): number {
  const value = type === 'weighted' ? bests.weightKg : type === 'bodyweight' ? bests.reps : bests.seconds;
  return value ?? 0;
}

interface RecordExercise {
  exerciseId: string;
  name: string;
  type: ExerciseType;
  sets: readonly RecordSet[];
}

/**
 * PURE: the records a workout set: each exercise whose best beats the best of every earlier workout
 * (`earlier`, by exercise id). The first time an exercise is done is a record, as in the prototype. An
 * exercise added twice is judged once, on all its sets.
 */
export function newRecords(
  exercises: readonly RecordExercise[],
  earlier: Readonly<Partial<Record<string, SetBests>>>,
): PersonalRecord[] {
  const byExercise = new Map<string, RecordExercise>();
  for (const exercise of exercises) {
    const seen = byExercise.get(exercise.exerciseId);
    byExercise.set(
      exercise.exerciseId,
      seen ? { ...seen, sets: [...seen.sets, ...exercise.sets] } : exercise,
    );
  }

  return [...byExercise.values()].flatMap(({ exerciseId, name, type, sets }) => {
    const value = recordValue(type, setBests(sets));
    const before = recordValue(type, earlier[exerciseId] ?? NO_BESTS);
    return value > 0 && value > before ? [{ exerciseId, name, type, value }] : [];
  });
}

/**
 * PURE: what some sets are worth by the exercise's record measure (heaviest weight lifted, most reps or
 * longest hold), counting only the sets the record rule counts. 0 for none.
 */
export function valueOf(type: ExerciseType, sets: readonly RecordSet[]): number {
  return recordValue(type, setBests(sets));
}

/**
 * PURE: a workout's sets that hold an exercise's record (`bests`: each exercise's best across every
 * finished workout), the rule Exercise detail marks its history with. One set per exercise: the first,
 * in workout order, to reach the record; a later equal set only matched it. A record beaten since is no
 * longer marked, as Exercise detail no longer marks that workout.
 */
export function recordSetIds(
  exercises: readonly {
    exerciseId: string;
    type: ExerciseType;
    sets: readonly (RecordSet & { id: string })[];
  }[],
  bests: Readonly<Partial<Record<string, SetBests>>>,
): Set<string> {
  // An exercise added twice is one exercise here too: its sets in workout order, across both entries.
  const byExercise = new Map<string, { type: ExerciseType; sets: (RecordSet & { id: string })[] }>();
  for (const { exerciseId, type, sets } of exercises) {
    const seen = byExercise.get(exerciseId);
    if (seen) seen.sets.push(...sets);
    else byExercise.set(exerciseId, { type, sets: [...sets] });
  }

  const ids = new Set<string>();
  for (const [exerciseId, { type, sets }] of byExercise) {
    const best = recordValue(type, bests[exerciseId] ?? NO_BESTS);
    const holder = best > 0 ? sets.find((set) => valueOf(type, [set]) >= best) : undefined;
    if (holder) ids.add(holder.id);
  }
  return ids;
}

/** PURE: "102.5 kg · heaviest weight", "12 reps · most reps" or "1 min 15 s · longest hold". */
export function recordLine(record: PersonalRecord, unit: WeightUnit): string {
  if (record.type === 'weighted') return `${formatWeight(record.value, unit)} · heaviest weight`;
  if (record.type === 'bodyweight') return `${record.value} reps · most reps`;
  return `${formatRest(record.value)} · longest hold`;
}
