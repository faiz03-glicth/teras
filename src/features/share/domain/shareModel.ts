import type { Highlight } from '@/features/exercises/domain/bodyMap';
import { volumeNumber, type WeightUnit } from '@/features/training/domain/preferences';
import type { MuscleSetRow, Workout } from '@/features/workouts/data/WorkoutRepository';
import { sessionSeconds, wholeMinutes } from '@/features/workouts/domain/duration';
import { workoutTotals } from '@/features/workouts/domain/totals';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { shortDay } from '@/shared/lib/format/dates';

import { bestLifts, shareLifts, type ShareLift } from './lifts';
import { musclesWorked, workedGroupsText } from './muscles';
import type { ShareLayout } from './types';

/** A big number on the picture, with its unit beside it: "6,420" "kg". */
export interface ShareStat {
  value: string;
  unit: string;
}

/** Everything a picture or the copied text says about one workout, already worded. */
export interface ShareModel {
  title: string;
  /** "Fri, 9 Oct". */
  dateLabel: string;
  /** Minutes, volume and sets. */
  stats: ShareStat[];
  /** Every exercise with a completed set, in the order they were done. */
  lifts: ShareLift[];
  /** The three best, shown big. */
  topLifts: ShareLift[];
  muscles: Highlight;
  /** "Chest, Shoulders, Triceps". */
  musclesText: string;
}

export type ShareWorkout = Pick<
  Workout,
  'id' | 'name' | 'date' | 'startedAt' | 'endedAt' | 'bodyweightKg' | 'exercises'
>;

export interface ShareInput {
  workout: ShareWorkout;
  unit: WeightUnit;
  today: ISODate;
  /** The exercises that set a personal record in this workout. */
  records: ReadonlySet<string>;
  /** The muscle rows of the workout's day (other workouts' rows are ignored). */
  muscleRows: readonly MuscleSetRow[];
}

/** PURE: a workout's three big numbers: minutes, volume in the chosen unit, and completed sets. */
export function summaryStats(workout: ShareWorkout, unit: WeightUnit): ShareStat[] {
  const totals = workoutTotals(workout);
  return [
    { value: String(wholeMinutes(sessionSeconds(workout.startedAt, workout.endedAt))), unit: 'min' },
    { value: volumeNumber(totals.volumeKg, unit), unit },
    { value: String(totals.sets), unit: totals.sets === 1 ? 'set' : 'sets' },
  ];
}

/** PURE: a finished workout as the share picture and text read it. */
export function buildShareModel({ workout, unit, today, records, muscleRows }: ShareInput): ShareModel {
  const lifts = shareLifts(workout.exercises, { unit, bodyweightKg: workout.bodyweightKg, records });
  const muscles = musclesWorked(muscleRows, workout.id);
  return {
    title: workout.name,
    dateLabel: shortDay(workout.date, today),
    stats: summaryStats(workout, unit),
    lifts,
    topLifts: bestLifts(lifts),
    muscles,
    musclesText: workedGroupsText(muscles),
  };
}

/** PURE: what a screen reader says for the picture (the picture itself is an image). */
export function pictureLabel(model: ShareModel, layout: ShareLayout): string {
  const head = `Workout picture: ${model.title}`;
  if (layout === 'summary') {
    return `${head}, ${model.stats.map((stat) => `${stat.value} ${stat.unit}`).join(', ')}`;
  }
  if (layout === 'lifts') {
    const lifts = model.topLifts.map((lift) => `${lift.name} ${lift.best}`).join(', ');
    return `${head}, best lifts: ${lifts || 'none'}`;
  }
  return `${head}, muscles worked: ${model.musclesText || 'none'}`;
}
