import type { ExerciseType, SetStatus, SetType } from '@/core/db/schema';
import { formatRest, weightNumber, type WeightUnit } from '@/features/training/domain/preferences';

/** A set as far as the picture goes: whether it counts, and what it measured. */
export interface LiftSet {
  status: SetStatus;
  setType: SetType;
  /** The lifted weight, or the ADDED weight for a bodyweight exercise. */
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/** An exercise of a finished workout. */
export interface LiftExercise {
  exerciseId: string;
  name: string;
  type: ExerciseType;
  sets: readonly LiftSet[];
}

/** One exercise of the workout, worded for the picture and the copied text. */
export interface ShareLift {
  exerciseId: string;
  name: string;
  /** Completed sets, warm-ups included: the count the workout's own totals use. */
  sets: number;
  /** The best set as it reads: "82.5 kg × 6", "+10 kg × 8", "12 reps" or "1 min 15 s". */
  best: string;
  /** The exercise set a personal record in this workout. */
  record: boolean;
  /** What ranks it among the day's lifts (see `bestLifts`). */
  rank: { loaded: boolean; value: number };
}

/** The Epley estimate of a one-rep max: a heavy set of few reps and a lighter one of many compare. */
const REPS_PER_THIRD_OF_LOAD = 30;
/** The picture shows this many lifts big. */
export const TOP_LIFTS = 3;

/** A set that counts towards a best: completed, not a warm-up, and it measured something. */
function counts(set: LiftSet, type: ExerciseType): boolean {
  if (set.status !== 'done' || set.setType === 'warmup') return false;
  return type === 'timed' ? (set.seconds ?? 0) > 0 : (set.reps ?? 0) > 0;
}

/**
 * Whether `next` beats `best` as the exercise's best set, by the rule the app's records use: the heaviest
 * weight lifted (then the most reps), the most reps for a bodyweight exercise (then the most added
 * weight), the longest hold for a timed one. A tie keeps the earlier set.
 */
function beats(next: LiftSet, best: LiftSet, type: ExerciseType): boolean {
  const weight = (set: LiftSet) => set.weightKg ?? 0;
  const reps = (set: LiftSet) => set.reps ?? 0;
  if (type === 'timed') return (next.seconds ?? 0) > (best.seconds ?? 0);
  const [first, second] =
    type === 'bodyweight'
      ? [reps(next) - reps(best), weight(next) - weight(best)]
      : [weight(next) - weight(best), reps(next) - reps(best)];
  return first > 0 || (first === 0 && second > 0);
}

/** PURE: the best of an exercise's counted sets, or null when none counts. */
function bestSet(type: ExerciseType, sets: readonly LiftSet[]): LiftSet | null {
  return sets
    .filter((set) => counts(set, type))
    .reduce<LiftSet | null>((best, set) => (best === null || beats(set, best, type) ? set : best), null);
}

/** PURE: one set as the picture words it, short enough to stand big: "82.5 kg × 6", "+10 kg × 8", "12 reps". */
export function liftText(set: LiftSet, type: ExerciseType, unit: WeightUnit): string {
  if (type === 'timed') return formatRest(set.seconds ?? 0);
  const reps = set.reps ?? 0;
  const weight = set.weightKg ?? 0;
  if (weight <= 0) return `${reps} ${reps === 1 ? 'rep' : 'reps'}`;
  const load = `${weightNumber(weight, unit)} ${unit}`;
  return `${type === 'bodyweight' ? '+' : ''}${load} × ${reps}`;
}

/** PURE: how strong a set is for ranking: the estimated one-rep max, a bodyweight lift carrying the body. */
function strength(set: LiftSet, type: ExerciseType, bodyweightKg: number): number {
  const added = set.weightKg ?? 0;
  const load = type === 'bodyweight' ? bodyweightKg + added : added;
  return load * (1 + (set.reps ?? 0) / REPS_PER_THIRD_OF_LOAD);
}

export interface LiftOptions {
  unit: WeightUnit;
  /** The bodyweight the workout started with, which a bodyweight lift is ranked with. */
  bodyweightKg: number;
  /** The exercises that set a personal record in this workout. */
  records: ReadonlySet<string>;
}

/**
 * PURE: the workout's exercises worded for the picture, in the order they were done. An exercise added
 * twice is one exercise, on all its sets. One with no counted set (warm-ups only) has no best and is left out.
 */
export function shareLifts(exercises: readonly LiftExercise[], options: LiftOptions): ShareLift[] {
  const merged = new Map<string, LiftExercise>();
  for (const exercise of exercises) {
    const seen = merged.get(exercise.exerciseId);
    merged.set(exercise.exerciseId, seen ? { ...seen, sets: [...seen.sets, ...exercise.sets] } : exercise);
  }

  return [...merged.values()].flatMap((exercise) => {
    const best = bestSet(exercise.type, exercise.sets);
    if (best === null) return [];
    const timed = exercise.type === 'timed';
    return [
      {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: exercise.sets.filter((set) => set.status === 'done').length,
        best: liftText(best, exercise.type, options.unit),
        record: options.records.has(exercise.exerciseId),
        rank: {
          loaded: !timed,
          value: timed ? (best.seconds ?? 0) : strength(best, exercise.type, options.bodyweightKg),
        },
      },
    ];
  });
}

/**
 * PURE: the lifts the picture shows big. Personal records first, then loaded lifts by their estimated
 * one-rep max, then timed holds by length; a tie keeps the order the workout did them in.
 */
export function bestLifts(lifts: readonly ShareLift[], count: number = TOP_LIFTS): ShareLift[] {
  return lifts
    .map((lift, index) => ({ lift, index }))
    .sort(
      (a, b) =>
        Number(b.lift.record) - Number(a.lift.record) ||
        Number(b.lift.rank.loaded) - Number(a.lift.rank.loaded) ||
        b.lift.rank.value - a.lift.rank.value ||
        a.index - b.index,
    )
    .slice(0, count)
    .map(({ lift }) => lift);
}
