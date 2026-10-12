import type { ExerciseType, SetStatus, SetType } from '@/core/db/schema';
import type { HeatLevel } from '@/features/heatmap/domain/grid';
import { addDays, startOfWeek } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * Progressive overload: a day is as dark as the lifts in it beat the same lifts last week. Each lift's best
 * set (the heaviest weight lifted for at least `WORKING_REPS` reps; a tie goes to more reps) is set against
 * that lift's matching session last week: its 1st of this week against last week's 1st, its 2nd against
 * the 2nd, and against last week's last once last week runs out. A timed lift compares its longest hold;
 * a bodyweight lift its added weight (none counts as 0), then its reps.
 */

/** The fewest reps for a weight to count as lifted, not just moved. */
export const WORKING_REPS = 5;
/** Weeks start on Monday, as the wave draws them. */
const WEEK_START = 'mon' as const;

export interface OverloadSet {
  status: SetStatus;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/** A lift's best set in one session. */
export interface BestSet {
  weightKg: number;
  reps: number;
  seconds: number;
}

/** One lift in one finished (or finishing) session: what it is judged by. */
export interface LiftSession {
  exerciseId: string;
  type: ExerciseType;
  /** The session's workout, and when it was: the order of a lift's sessions within a week. */
  workoutId: string;
  date: ISODate;
  startedAt: string;
  sets: readonly OverloadSet[];
}

export type Trend = 'up' | 'held' | 'down' | 'new';

const counts = (set: OverloadSet) => set.status === 'done' && set.setType !== 'warmup';

/** PURE: a lift's best set in a session, or null when nothing in it counts (no completed working set). */
export function bestSet(type: ExerciseType, sets: readonly OverloadSet[]): BestSet | null {
  const done = sets.filter(counts);
  if (type === 'timed') {
    const seconds = Math.max(0, ...done.map((set) => set.seconds ?? 0));
    return seconds > 0 ? { weightKg: 0, reps: 0, seconds } : null;
  }
  const lifted = done.filter((set) => (set.reps ?? 0) > 0);
  if (lifted.length === 0) return null;
  // Below the working reps everywhere (a heavy single, say): the best of what was done still compares.
  const working = lifted.filter((set) => (set.reps ?? 0) >= WORKING_REPS);
  const pool = working.length > 0 ? working : lifted;
  return pool.reduce<BestSet>(
    (best, set) => {
      const weightKg = set.weightKg ?? 0;
      const reps = set.reps ?? 0;
      if (weightKg > best.weightKg || (weightKg === best.weightKg && reps > best.reps)) {
        return { weightKg, reps, seconds: 0 };
      }
      return best;
    },
    { weightKg: -1, reps: -1, seconds: 0 },
  );
}

/** PURE: this session's best against the one it is matched with. `then` null: nothing to compare yet. */
export function trend(type: ExerciseType, now: BestSet, then: BestSet | null): Trend {
  if (!then) return 'new';
  if (type === 'timed')
    return now.seconds > then.seconds ? 'up' : now.seconds === then.seconds ? 'held' : 'down';
  if (now.weightKg !== then.weightKg) return now.weightKg > then.weightKg ? 'up' : 'down';
  return now.reps > then.reps ? 'up' : now.reps === then.reps ? 'held' : 'down';
}

const byStart = (a: LiftSession, b: LiftSession) => a.startedAt.localeCompare(b.startedAt);

/** The sessions of one lift in the week that starts on `monday`, in the order they were done. */
function weekOf(sessions: readonly LiftSession[], monday: ISODate): LiftSession[] {
  const sunday = addDays(monday, 6);
  return sessions.filter((one) => one.date >= monday && one.date <= sunday).sort(byStart);
}

/** The session a lift's `index`-th of a week is matched with in the week before: same place, or its last. */
function matchIn(previousWeek: readonly LiftSession[], index: number): LiftSession | null {
  return previousWeek[index] ?? previousWeek.at(-1) ?? null;
}

/** A lift in a session, judged: its trend, and whether what it beat had itself beaten its own last week. */
export interface LiftStanding {
  exerciseId: string;
  trend: Trend;
  /** Up, and the session it is matched with was up too: two weeks running. */
  twoWeeksRunning: boolean;
  now: BestSet;
  /** What it was matched with last week, or null when there was none. */
  then: BestSet | null;
}

/**
 * PURE: how one lift's `session` stands, given every session of that lift (this one included) from two
 * weeks before its week on. Null when nothing in the session counts.
 */
export function liftStanding(session: LiftSession, history: readonly LiftSession[]): LiftStanding | null {
  const now = bestSet(session.type, session.sets);
  if (!now) return null;
  const own = history.filter((one) => one.exerciseId === session.exerciseId && bestSet(one.type, one.sets));
  const monday = startOfWeek(session.date, WEEK_START);
  const thisWeek = weekOf(own, monday);
  const index = Math.max(
    0,
    thisWeek.findIndex((one) => one.workoutId === session.workoutId),
  );
  const lastWeek = weekOf(own, addDays(monday, -7));
  const matched = matchIn(lastWeek, index);
  const then = matched ? bestSet(matched.type, matched.sets) : null;
  const result = trend(session.type, now, then);

  let twoWeeksRunning = false;
  if (result === 'up' && matched && then) {
    const before = matchIn(weekOf(own, addDays(monday, -14)), Math.max(0, lastWeek.indexOf(matched)));
    const beforeBest = before ? bestSet(before.type, before.sets) : null;
    twoWeeksRunning = trend(matched.type, then, beforeBest) === 'up';
  }
  return { exerciseId: session.exerciseId, trend: result, twoWeeksRunning, now, then };
}

/**
 * PURE: what a lift's next session, on `date`, will be judged against: the best set of last week's session
 * in the same place (its first of this week against last week's first, and so on, last week's last once it
 * runs out). Null when last week had none: nothing to beat yet. `history` holds the lift's finished sessions
 * from last week's Monday to `date`.
 */
export function nextMatch(
  exerciseId: string,
  date: ISODate,
  history: readonly LiftSession[],
): BestSet | null {
  const own = history.filter((one) => one.exerciseId === exerciseId && bestSet(one.type, one.sets));
  const monday = startOfWeek(date, WEEK_START);
  const matched = matchIn(weekOf(own, addDays(monday, -7)), weekOf(own, monday).length);
  return matched ? bestSet(matched.type, matched.sets) : null;
}

/**
 * PURE: a day's heat level from how its lifts stood:
 * 0 No workout: nothing completed · 1 Light: trained, nothing held or beaten (a first week lands here) ·
 * 2 Moderate: matched last week, beat nothing · 3 Strong: beat last week on at least one lift ·
 * 4 Peak: a lift beat last week for the second week running.
 * `trained` is whether the day had any completed set at all (a day of warm-ups is still a day trained).
 */
export function overloadLevel(standings: readonly LiftStanding[], trained: boolean): HeatLevel {
  if (!trained) return 0;
  if (standings.some((one) => one.twoWeeksRunning)) return 4;
  if (standings.some((one) => one.trend === 'up')) return 3;
  if (standings.some((one) => one.trend === 'held')) return 2;
  return 1;
}

/** What beats a best set: the same weight for one more rep, or the next weight up for the working reps. */
export interface BeatTarget {
  moreReps: { weightKg: number; reps: number } | null;
  heavier: { weightKg: number; reps: number } | null;
  /** Timed lifts: a longer hold (seconds). */
  longer: number | null;
}

/** PURE: what beats `then`. `stepKg` is the next weight up (2.5 kg on most equipment). */
export function beatTarget(type: ExerciseType, then: BestSet, stepKg: number): BeatTarget {
  if (type === 'timed') return { moreReps: null, heavier: null, longer: then.seconds + 5 };
  return {
    moreReps: { weightKg: then.weightKg, reps: then.reps + 1 },
    heavier: { weightKg: then.weightKg + stepKg, reps: WORKING_REPS },
    longer: null,
  };
}
