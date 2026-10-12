import type { ExerciseType } from '@/core/db/schema';
import type { HeatLevel } from '@/features/heatmap/domain/grid';
import type { DayTotals } from '@/features/workoutDays/domain/WorkoutDay';
import { liftStanding, overloadLevel, type LiftSession } from '@/features/workouts/domain/overload';
import { dayTotals } from '@/features/workouts/domain/totals';
import { addDays, startOfWeek } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { EXERCISE_MATCHES, type ExerciseMatch } from './exerciseMatches';
import type { HistoryRow } from './historyCsv';
import { uuidV5 } from './uuidV5';

/**
 * PURE: what the six-year history import would write, worked out before anything is written. Every rule
 * is the owner's (12 Oct 2026): a workout per session, named exactly as its Split; on its own date, at
 * 18:00 in Kuala Lumpur (UTC+8) for 100 minutes; 120 s rest per exercise; every set done and normal, its
 * load exactly as written; the session's body weight as the workout's snapshot. A date that already has
 * a workout on the phone is left alone. Each day's level is the progressive-overload rule's, worked out
 * in date order against only the days up to it (the phone's own workouts included), as if logged that day.
 */

/** The import's own namespace: every id is the UUIDv5 of the owner and the file's own id within it. */
export const IMPORT_NAMESPACE = 'c6a3f9e2-4b1d-4e8a-9f27-3d5b8c1e0a74';
/** 18:00 in Kuala Lumpur is 10:00 UTC on the same date; 100 minutes later is 11:40. */
const START_UTC = 'T10:00:00.000Z';
const END_UTC = 'T11:40:00.000Z';
export const IMPORT_REST_SECONDS = 120;
/** What a bodyweight lift's weight means in the app: the weight added to the body. */
const ADDED_LOAD = 'external load added kg';

export interface LibraryExercise {
  id: string;
  name: string;
  equipment: string;
  primaryMuscle: string;
  type: ExerciseType;
}

export interface PlannedSet {
  id: string;
  sourceSetId: string;
  position: number;
  weightKg: number;
  reps: number;
}

export interface PlannedExercise {
  id: string;
  sourceLogId: string;
  exerciseId: string;
  type: ExerciseType;
  position: number;
  sets: PlannedSet[];
}

export interface PlannedWorkout {
  id: string;
  sessionId: string;
  name: string;
  date: ISODate;
  startedAt: string;
  endedAt: string;
  bodyweightKg: number;
  exercises: PlannedExercise[];
  totals: DayTotals;
  level: HeatLevel;
}

export interface MatchReport extends ExerciseMatch {
  source: string;
  matchedName: string | null;
  equipment: string | null;
  muscle: string | null;
  type: ExerciseType | null;
  sets: number;
}

export interface SkippedSession {
  sessionId: string;
  date: string;
  reason: string;
}

export interface ImportPlan {
  workouts: PlannedWorkout[];
  skipped: SkippedSession[];
  matches: MatchReport[];
  /** Problems that leave something out or need a look; the rest can still go ahead. */
  issues: string[];
  /** Problems that stop the import: nothing is written while there is one. */
  blockers: string[];
}

export interface PlanInput {
  rows: readonly HistoryRow[];
  library: ReadonlyMap<string, LibraryExercise>;
  /** The signed-in user the rows are for; part of every id. */
  owner: string;
  /** Dates that already have a (not deleted) workout on the phone. */
  existingDates: ReadonlySet<string>;
  /** The phone's own finished lift sessions, so a day's level also sees them. */
  existingSessions: readonly LiftSession[];
  today: ISODate;
}

const idFor = (owner: string, kind: string, sourceId: string) =>
  uuidV5(`teras-history:${owner}:${kind}:${sourceId}`, IMPORT_NAMESPACE);

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

const distinct = (values: readonly (string | number)[]) => new Set(values).size;

/** PURE: how every source name is matched, and to what. */
function matchReports(
  rows: readonly HistoryRow[],
  library: ReadonlyMap<string, LibraryExercise>,
): MatchReport[] {
  return [...groupBy(rows, (row) => row.Exercise_Name)].map(([source, sets]) => {
    const match = EXERCISE_MATCHES[source];
    const exercise = match ? library.get(match.exerciseId) : undefined;
    return {
      source,
      exerciseId: match?.exerciseId ?? '',
      match: match?.match ?? 'semantic',
      confidence: match?.confidence ?? 'medium',
      note: match?.note,
      matchedName: exercise?.name ?? null,
      equipment: exercise?.equipment ?? null,
      muscle: exercise?.primaryMuscle ?? null,
      type: exercise?.type ?? null,
      sets: sets.length,
    };
  });
}

/** PURE: a session's inconsistencies, or none. */
function checkSession(sessionId: string, rows: readonly HistoryRow[]): string[] {
  const issues: string[] = [];
  if (distinct(rows.map((row) => row.Workout_Date)) > 1) issues.push(`${sessionId}: more than one date`);
  if (distinct(rows.map((row) => row.Split)) > 1) issues.push(`${sessionId}: more than one Split`);
  if (distinct(rows.map((row) => row.Body_Weight_kg)) > 1)
    issues.push(`${sessionId}: more than one body weight`);
  const logs = groupBy(rows, (row) => row.Exercise_Log_ID);
  const orders = [...logs.values()].map((sets) => sets[0]?.Exercise_Order ?? 0).sort((a, b) => a - b);
  if (orders.some((order, i) => order !== i + 1))
    issues.push(`${sessionId}: exercise order is not 1…${orders.length}`);
  if (distinct([...logs.values()].map((sets) => sets[0]?.Exercise_Name ?? '')) < logs.size) {
    issues.push(`${sessionId}: the same exercise twice`);
  }
  for (const [logId, sets] of logs) {
    if (distinct(sets.map((set) => set.Exercise_Name)) > 1) issues.push(`${logId}: more than one exercise`);
    const numbers = sets.map((set) => set.Set_Number).sort((a, b) => a - b);
    if (numbers.some((n, i) => n !== i + 1)) issues.push(`${logId}: set numbers are not 1…${numbers.length}`);
  }
  return issues;
}

/** PURE: one session as the workout it becomes (level 0 until worked out in date order). */
function plannedWorkout(
  owner: string,
  sessionId: string,
  rows: readonly HistoryRow[],
  library: ReadonlyMap<string, LibraryExercise>,
): PlannedWorkout {
  const first = rows[0] as HistoryRow;
  const date = first.Workout_Date as ISODate;
  const logs = [...groupBy(rows, (row) => row.Exercise_Log_ID)].sort(
    ([, a], [, b]) => (a[0]?.Exercise_Order ?? 0) - (b[0]?.Exercise_Order ?? 0),
  );
  const exercises = logs.map(([logId, sets], position): PlannedExercise => {
    const exerciseId = EXERCISE_MATCHES[sets[0]?.Exercise_Name ?? '']?.exerciseId ?? '';
    return {
      id: idFor(owner, 'exercise-log', logId),
      sourceLogId: logId,
      exerciseId,
      type: library.get(exerciseId)?.type ?? 'weighted',
      position,
      sets: [...sets]
        .sort((a, b) => a.Set_Number - b.Set_Number)
        .map((set, index) => ({
          id: idFor(owner, 'set', set.Set_ID),
          sourceSetId: set.Set_ID,
          position: index,
          weightKg: set.Load_kg,
          reps: set.Reps,
        })),
    };
  });
  const totals = dayTotals([
    {
      bodyweightKg: first.Body_Weight_kg,
      sets: exercises.flatMap((exercise) =>
        exercise.sets.map((set) => ({
          status: 'done' as const,
          weightKg: set.weightKg,
          reps: set.reps,
          type: exercise.type,
        })),
      ),
    },
  ]);
  return {
    id: idFor(owner, 'session', sessionId),
    sessionId,
    name: first.Split,
    date,
    startedAt: `${date}${START_UTC}`,
    endedAt: `${date}${END_UTC}`,
    bodyweightKg: first.Body_Weight_kg,
    exercises,
    totals,
    level: 0,
  };
}

const liftSessionsOf = (workout: PlannedWorkout): LiftSession[] =>
  workout.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    type: exercise.type,
    workoutId: workout.id,
    date: workout.date,
    startedAt: workout.startedAt,
    sets: exercise.sets.map((set) => ({
      status: 'done' as const,
      setType: 'normal' as const,
      weightKg: set.weightKg,
      reps: set.reps,
      seconds: null,
    })),
  }));

/**
 * PURE: every planned day's level, in date order, read as WorkoutRepository.levelOn reads it: the day's
 * lifts against the sessions from two weeks before its week up to the day, never anything after it.
 */
function withLevels(workouts: readonly PlannedWorkout[], existing: readonly LiftSession[]): PlannedWorkout[] {
  const all = [...existing, ...workouts.flatMap(liftSessionsOf)].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt),
  );
  let from = 0;
  return [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((workout) => {
      const windowStart = addDays(startOfWeek(workout.date, 'mon'), -14);
      while (from < all.length && (all[from]?.date ?? '') < windowStart) from += 1;
      let to = from;
      while (to < all.length && (all[to]?.date ?? '') <= workout.date) to += 1;
      const window = all.slice(from, to);
      const standings = window
        .filter((session) => session.date === workout.date)
        .flatMap((session) => liftStanding(session, window) ?? []);
      return { ...workout, level: overloadLevel(standings, workout.totals.sets > 0) };
    });
}

/** PURE: problems with what the file says, for the matched exercises. */
function loadIssues(rows: readonly HistoryRow[], library: ReadonlyMap<string, LibraryExercise>): string[] {
  const issues: string[] = [];
  for (const row of rows) {
    const type = library.get(EXERCISE_MATCHES[row.Exercise_Name]?.exerciseId ?? '')?.type;
    if (type === 'bodyweight' && row.Load_Basis !== ADDED_LOAD) {
      issues.push(`line ${row.line}: a bodyweight lift whose load is "${row.Load_Basis}"`);
    } else if (type !== 'bodyweight' && row.Load_Basis === ADDED_LOAD) {
      issues.push(`line ${row.line}: a ${type ?? 'unmatched'} lift whose load is added weight`);
    } else if (type === 'timed') {
      issues.push(`line ${row.line}: matched to a timed exercise, but the file has reps`);
    }
  }
  return issues;
}

/** PURE: the whole plan. While there is a blocker it plans no workout at all. */
export function planImport(input: PlanInput): ImportPlan {
  const { rows, library, owner, existingDates, existingSessions, today } = input;
  const matches = matchReports(rows, library);
  const blockers = matches.flatMap((match) => {
    if (!EXERCISE_MATCHES[match.source]) return [`"${match.source}": no match`];
    if (!match.matchedName) return [`"${match.source}": ${match.exerciseId} is not in the library`];
    return [];
  });
  const issues = loadIssues(rows, library);

  const sessions = groupBy(rows, (row) => row.Session_ID);
  const byDate = groupBy([...sessions.values()], (sessionRows) => sessionRows[0]?.Workout_Date ?? '');
  for (const [date, list] of byDate) {
    if (list.length > 1) issues.push(`${date}: ${list.length} sessions on one day`);
  }

  const skipped: SkippedSession[] = [];
  const planned: PlannedWorkout[] = [];
  for (const [sessionId, sessionRows] of sessions) {
    const date = sessionRows[0]?.Workout_Date ?? '';
    const problems = checkSession(sessionId, sessionRows);
    if (problems.length > 0) {
      issues.push(...problems);
      skipped.push({ sessionId, date, reason: 'inconsistent rows' });
    } else if (date > today) {
      skipped.push({ sessionId, date, reason: 'after today' });
    } else if (existingDates.has(date)) {
      skipped.push({ sessionId, date, reason: 'the phone already has a workout that day' });
    } else {
      planned.push(plannedWorkout(owner, sessionId, sessionRows, library));
    }
  }

  return {
    workouts: blockers.length > 0 ? [] : withLevels(planned, existingSessions),
    skipped: skipped.sort((a, b) => a.date.localeCompare(b.date)),
    matches: matches.sort((a, b) => a.source.localeCompare(b.source)),
    issues,
    blockers,
  };
}
