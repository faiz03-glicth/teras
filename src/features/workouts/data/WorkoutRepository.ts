import type { ExerciseType, SetStatus, SetType, WorkoutRow, WorkoutSetRow } from '@/core/db/schema';
import type { HeatLevel } from '@/features/heatmap/domain/grid';
import type { DayTotals, WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { WorkoutDayRepository } from '@/features/workoutDays/data/WorkoutDayRepository';
import { addDays, startOfWeek } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { sessionSeconds } from '../domain/duration';
import type { ExerciseSession } from '../domain/progress';
import { newRecords, recordValue, type PersonalRecord, type SetBests } from '../domain/records';
import type { PreviousSet } from '../domain/setUnits';
import { liftStanding, nextMatch, overloadLevel, type BestSet, type LiftSession } from '../domain/overload';
import { isPastLog, pastLogEnd, pastLogStart } from '../domain/pastLog';
import { isEmptySet, NothingToTickError, tickFill, type SetValues } from '../domain/tickFill';
import { dayTotals } from '../domain/totals';
import type { LiftSetRow, MuscleSetRow, WorkoutDao, WorkoutOwner } from './local/workoutDao';

export type { MuscleSetRow, WorkoutOwner } from './local/workoutDao';

/** A lift's sets, one session (workout) each, in the order they were done. */
function liftSessions(rows: readonly LiftSetRow[]): LiftSession[] {
  const byKey = new Map<string, LiftSession & { sets: LiftSetRow[] }>();
  for (const row of rows) {
    const key = `${row.workoutId}:${row.exerciseId}`;
    const session = byKey.get(key);
    if (session) {
      session.sets.push(row);
      continue;
    }
    byKey.set(key, {
      exerciseId: row.exerciseId,
      type: row.type,
      workoutId: row.workoutId,
      date: row.date as ISODate,
      startedAt: row.startedAt,
      sets: [row],
    });
  }
  return [...byKey.values()];
}
export type { PersonalRecord } from '../domain/records';
export type { ExerciseSession } from '../domain/progress';
export type { PreviousSet } from '../domain/setUnits';

/** A set as it was the moment it was deleted, whole: what an Undo puts back. Only `restoreSet` reads it. */
export interface RemovedSet {
  readonly row: WorkoutSetRow;
}

/** One row of the set table. `weightKg` is the added weight for a bodyweight exercise. */
export interface WorkoutSet {
  id: string;
  position: number;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  status: SetStatus;
  setType: SetType;
  rpe: number | null;
  note: string | null;
}

export interface WorkoutExercise {
  /** The id of this exercise WITHIN the workout; `exerciseId` is the library entry. */
  id: string;
  exerciseId: string;
  name: string;
  type: ExerciseType;
  restSeconds: number;
  sets: WorkoutSet[];
}

/** A workout and everything on its screen. Assembled on every read; there is no cached copy. */
export interface Workout {
  id: string;
  name: string;
  routineId: string | null;
  date: ISODate;
  startedAt: string;
  endedAt: string | null;
  bodyweightKg: number;
  exercises: WorkoutExercise[];
  /** Logged after its day (`isPastLog`): a plain log, with no clock and no rest. Absent for a live one. */
  pastLog?: boolean;
}

/** A routine as the Workout tab shows it: enough to recognise and start it, nothing more. */
export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
  /** The exercise names in order, for the card's preview line. */
  exercises: string[];
  /** The last time the owner did it, and how that day stood: "Peak · yesterday". Null if never. */
  last: { date: ISODate; level: HeatLevel } | null;
}

/** An exercise of a finished workout, with how many of its sets were completed. */
export interface ExerciseSummary {
  name: string;
  sets: number;
}

/** A finished workout as the Home feed, the Calendar and a day's detail list it. */
export interface WorkoutSummary {
  id: string;
  name: string;
  date: ISODate;
  startedAt: string;
  /** How long it ran, in seconds. */
  durationSeconds: number;
  volumeKg: number;
  sets: number;
  /** The reps of its completed sets; a timed set counts none. */
  reps: number;
  /** The exercises with at least one completed set, in the order they were done. */
  exercises: ExerciseSummary[];
  /**
   * The level its day was recorded at (frozen, read back from workout_days, never recomputed): the
   * colour of that day's cell. Two workouts of one day share it, because the day is what is judged.
   */
  dayLevel: HeatLevel;
}

export interface StartWorkoutInput {
  /** The local calendar day the session starts on: the day it counts towards. */
  date: ISODate;
  /** A snapshot, so logging a new bodyweight never changes a past day. */
  bodyweightKg: number;
  /** The person's default rest, given to every exercise added. */
  restSeconds: number;
  /** Start from one of their routines; omitted for an empty workout. */
  routineId?: string;
}

export type SetPatch = Partial<
  Pick<WorkoutSet, 'weightKg' | 'reps' | 'seconds' | 'setType' | 'rpe' | 'note'>
>;

/**
 * The workout in progress. Every change returns the whole workout, so a screen never has to merge a
 * patch into what it is showing. SQLite is the source of truth: closing the app mid-workout loses nothing.
 */
export interface WorkoutRepository {
  /** The routines this person can start a workout from. */
  routines(owner: WorkoutOwner): Promise<RoutineSummary[]>;
  /** Throws if one is already in progress for this owner: finish or discard it first. */
  start(owner: WorkoutOwner, input: StartWorkoutInput): Promise<Workout>;
  /** The workout that has not been finished, or null. */
  active(owner: WorkoutOwner): Promise<Workout | null>;
  /** Finished workouts, most recent first: what Home lists under the wave. */
  history(owner: WorkoutOwner, limit: number): Promise<WorkoutSummary[]>;
  /** Finished workouts dated within the range (inclusive), most recent first: a day's, or the Calendar's. */
  historyBetween(owner: WorkoutOwner, from: ISODate, to: ISODate): Promise<WorkoutSummary[]>;
  /**
   * Each exercise of the finished workouts dated `from`..`to` (inclusive) with its muscles and completed
   * sets: what the muscle cards (this week's map, balance, history) are computed from.
   */
  muscleSets(owner: WorkoutOwner, from: ISODate, to: ISODate): Promise<MuscleSetRow[]>;
  get(id: string): Promise<Workout | null>;
  /** A workout as its owner logged it, or null if it is not theirs: what a link to a session may open. */
  logged(owner: WorkoutOwner, id: string): Promise<Workout | null>;
  /**
   * What each exercise's completed sets were the last time it was in a finished workout, in order: the
   * Previous column. An exercise never completed has no entry.
   */
  previousSets(
    owner: WorkoutOwner,
    exerciseIds: readonly string[],
  ): Promise<Partial<Record<string, PreviousSet[]>>>;
  /**
   * What each exercise has to beat in a workout started on `date`: the best set of the session it will be
   * judged against (its matching session last week, see `nextMatch`). An exercise with nothing last week has
   * no entry. A workout still running is left out: it has set nothing yet.
   */
  toBeat(
    owner: WorkoutOwner,
    exerciseIds: readonly string[],
    date: ISODate,
  ): Promise<Partial<Record<string, BestSet>>>;
  /**
   * The personal records a finished workout set, judged against the owner's earlier workouts. Empty for a
   * workout that is not theirs.
   */
  newRecords(owner: WorkoutOwner, workoutId: string): Promise<PersonalRecord[]>;
  /**
   * Each exercise's best across every finished workout of the owner: its records as they stand now. An
   * exercise never completed has no entry.
   */
  bests(owner: WorkoutOwner, exerciseIds: readonly string[]): Promise<Partial<Record<string, SetBests>>>;
  /**
   * Every exercise's record as it stands, across the owner's finished workouts: the Records list, the one
   * trained most recently first. An exercise with nothing that counts (a weight never lifted) has none.
   */
  records(owner: WorkoutOwner): Promise<PersonalRecord[]>;
  /**
   * Every finished workout an exercise was completed in, the latest first, with its completed sets: what
   * an exercise's records, chart and history are worked out from.
   */
  exerciseHistory(owner: WorkoutOwner, exerciseId: string): Promise<ExerciseSession[]>;
  /**
   * `restSeconds` is the person's default, used when the workout has no exercise to match yet. The
   * exercise arrives as it was done last time (as many sets, the same numbers), or with one empty set.
   */
  addExercise(workoutId: string, exerciseId: string, restSeconds: number): Promise<Workout>;
  removeExercise(workoutExerciseId: string): Promise<Workout>;
  /** A new set below the last, with its numbers, so the next set is usually one tick. */
  addSet(workoutExerciseId: string): Promise<Workout>;
  updateSet(setId: string, patch: SetPatch): Promise<Workout>;
  /**
   * Ticking a set with nothing typed in fills it from the set above, or from last time's set of the same
   * number; with nothing to copy it throws NothingToTickError and the set stays as it was.
   */
  setStatus(setId: string, status: SetStatus): Promise<Workout>;
  /** Deletes one set; the sets around it keep their order. Hands back the set too, for an Undo. */
  removeSet(setId: string): Promise<{ workout: Workout; removed: RemovedSet }>;
  /**
   * Puts a deleted set back exactly as it was (its numbers, ticked or not) in the place it left, the sets
   * below moving down one. Throws once its exercise is gone or its workout is no longer running, so a
   * finished workout never changes behind the day it wrote. Putting back a set that is there already
   * changes nothing.
   */
  restoreSet(removed: RemovedSet): Promise<Workout>;
  /**
   * Ends the workout and writes the day it belongs to: the totals cover every workout of that date, and
   * the heat level is computed from them. This is the only path by which training reaches Streak.
   */
  finish(workoutId: string): Promise<WorkoutDay>;
  /** Throws it away, exercises and sets included. */
  discard(workoutId: string): Promise<void>;
  /**
   * Deletes a workout that was finished, exercises and sets included, and rewrites the day it belonged to
   * from the workouts that remain. A day left with none is stored as no workout (0 sets, level 0), never
   * removed, so the change still reaches Streak. Throws for a workout that is not the owner's or is still
   * running (that one is discarded); nothing is deleted if the day cannot be written.
   */
  deleteLogged(owner: WorkoutOwner, workoutId: string): Promise<WorkoutDay>;
}

export interface LocalWorkoutDeps {
  dao: WorkoutDao;
  workoutDays: WorkoutDayRepository;
  uuid: () => string;
  now: () => string;
}

const DEFAULT_NAME = 'Workout';

/** What a new set is filled with: nothing recorded yet. */
const EMPTY_SET: PreviousSet = { weightKg: null, reps: null, seconds: null };

/**
 * The numbers `count` new sets start with: last time's sets in order, the last of them repeated if
 * there are more sets now, and `fallback` for an exercise not done before. As the prototype has it, the
 * fields start with what was done last time, so a set is usually one tap on the tick.
 */
function startingSets(previous: readonly PreviousSet[], count: number, fallback: PreviousSet): PreviousSet[] {
  return Array.from(
    { length: Math.max(1, count) },
    (_, index) => previous[index] ?? previous.at(-1) ?? fallback,
  );
}

/** Items by a key, each group keeping the order the items came in. */
function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export class LocalWorkoutRepository implements WorkoutRepository {
  constructor(private readonly deps: LocalWorkoutDeps) {}

  async start(owner: WorkoutOwner, input: StartWorkoutInput): Promise<Workout> {
    const { dao, uuid, now } = this.deps;
    // One at a time, per person: a second would quietly split the day's sets across two sessions, and
    // only one of them would ever be on screen.
    const running = await dao.getActive(owner);
    if (running) throw new Error(`A workout is already in progress (${running.id})`);
    const routine = input.routineId ? await dao.getRoutine(input.routineId) : null;
    const workoutId = uuid();
    const timestamp = now();

    await dao.insertWorkout({
      id: workoutId,
      userId: owner,
      createdAt: timestamp,
      updatedAt: timestamp,
      name: routine?.name ?? DEFAULT_NAME,
      routineId: routine?.id ?? null,
      date: input.date,
      // A past day's log starts on that day, so its history and last week's lifts read in order.
      startedAt: isPastLog(input.date, timestamp) ? pastLogStart(input.date, timestamp) : timestamp,
      bodyweightKg: input.bodyweightKg,
    });

    if (routine) {
      const items = await dao.routineItems(routine.id);
      const previous = await this.previousSets(
        owner,
        items.map((item) => item.exerciseId),
      );
      for (const [position, item] of items.entries()) {
        // The routine says how many sets; last time says what goes in them, else its own targets.
        const targets = { weightKg: item.startWeightKg, reps: item.targetReps, seconds: item.targetSeconds };
        await this.insertExerciseWithSets(workoutId, owner, {
          exerciseId: item.exerciseId,
          position,
          restSeconds: input.restSeconds,
          sets: startingSets(previous[item.exerciseId] ?? [], item.targetSets, targets),
        });
      }
    }

    return this.require(workoutId);
  }

  async routines(owner: WorkoutOwner): Promise<RoutineSummary[]> {
    const { dao, workoutDays } = this.deps;
    const rows = await dao.listRoutines(owner);
    const ids = rows.map((row) => row.id);
    // Every routine's names and last day in a few reads, not a few per routine.
    const [named, lastDates] = await Promise.all([
      dao.routineExerciseNames(ids),
      dao.lastRoutineDates(owner, ids),
    ]);
    const names = new Map<string, string[]>();
    for (const { routineId, name } of named) {
      names.set(routineId, [...(names.get(routineId) ?? []), name]);
    }
    const lastOf = new Map(lastDates.map((row) => [row.routineId, row.date as ISODate]));
    const dates = [...lastOf.values()].sort();
    const oldest = dates[0];
    const newest = dates.at(-1);
    const days = oldest && newest ? await workoutDays.list(owner, oldest, newest) : [];
    const levels = new Map(days.map((day) => [day.date, day.level]));
    return rows.map((row) => {
      const exercises = names.get(row.id) ?? [];
      const date = lastOf.get(row.id);
      return {
        id: row.id,
        name: row.name,
        exerciseCount: exercises.length,
        exercises,
        last: date ? { date, level: levels.get(date) ?? 0 } : null,
      };
    });
  }

  async active(owner: WorkoutOwner): Promise<Workout | null> {
    const row = await this.deps.dao.getActive(owner);
    return row ? this.load(row.id) : null;
  }

  async history(owner: WorkoutOwner, limit: number): Promise<WorkoutSummary[]> {
    return this.summarise(owner, await this.deps.dao.finishedWorkouts(owner, limit));
  }

  async historyBetween(owner: WorkoutOwner, from: ISODate, to: ISODate): Promise<WorkoutSummary[]> {
    return this.summarise(owner, await this.deps.dao.finishedWorkoutsBetween(owner, from, to));
  }

  muscleSets(owner: WorkoutOwner, from: ISODate, to: ISODate): Promise<MuscleSetRow[]> {
    return this.deps.dao.muscleSetsBetween(owner, from, to);
  }

  async get(id: string): Promise<Workout | null> {
    return this.load(id);
  }

  async logged(owner: WorkoutOwner, id: string): Promise<Workout | null> {
    const row = await this.deps.dao.getWorkout(id);
    // A link can name any workout on the phone; only the owner's own (a guest's, for a guest) opens.
    if (!row || row.userId !== owner) return null;
    return this.load(id);
  }

  async previousSets(
    owner: WorkoutOwner,
    exerciseIds: readonly string[],
  ): Promise<Partial<Record<string, PreviousSet[]>>> {
    const rows = await this.deps.dao.lastDoneSets(owner, exerciseIds);
    const sets: Partial<Record<string, PreviousSet[]>> = {};
    for (const { exerciseId, ...set } of rows) sets[exerciseId] = [...(sets[exerciseId] ?? []), set];
    return sets;
  }

  async newRecords(owner: WorkoutOwner, workoutId: string): Promise<PersonalRecord[]> {
    const workout = await this.logged(owner, workoutId);
    if (!workout) return [];
    const ids = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))];
    // Only the workouts started before this one: a record is what it beat, not what came after.
    return newRecords(workout.exercises, await this.bestsOf(owner, ids, workout.startedAt));
  }

  bests(owner: WorkoutOwner, exerciseIds: readonly string[]): Promise<Partial<Record<string, SetBests>>> {
    return this.bestsOf(owner, exerciseIds);
  }

  async records(owner: WorkoutOwner): Promise<PersonalRecord[]> {
    const rows = await this.deps.dao.records(owner);
    return [...rows]
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .map(({ exerciseId, name, type, ...bests }) => ({
        exerciseId,
        name,
        type,
        value: recordValue(type, bests),
      }))
      .filter((record) => record.value > 0);
  }

  private async bestsOf(
    owner: WorkoutOwner,
    exerciseIds: readonly string[],
    before?: string,
  ): Promise<Partial<Record<string, SetBests>>> {
    const rows = await this.deps.dao.bests(owner, exerciseIds, before);
    const bests: Partial<Record<string, SetBests>> = {};
    for (const { exerciseId, ...best } of rows) bests[exerciseId] = best;
    return bests;
  }

  async exerciseHistory(owner: WorkoutOwner, exerciseId: string): Promise<ExerciseSession[]> {
    // All of one exercise's completed sets, so every figure on its screen comes from the same pure rules.
    // Even years of one lift is a few thousand small rows.
    const rows = await this.deps.dao.exerciseSets(owner, exerciseId);
    const sessions = new Map<string, ExerciseSession>();
    for (const { workoutId, name, date, startedAt, ...set } of rows) {
      const session = sessions.get(workoutId);
      if (session) session.sets.push(set);
      else sessions.set(workoutId, { workoutId, name, date: date as ISODate, startedAt, sets: [set] });
    }
    return [...sessions.values()];
  }

  async addExercise(workoutId: string, exerciseId: string, restSeconds: number): Promise<Workout> {
    const { dao } = this.deps;
    const workout = await dao.getWorkout(workoutId);
    if (!workout) throw new Error(`No workout ${workoutId}`);
    const previous = (await this.previousSets(workout.userId, [exerciseId]))[exerciseId] ?? [];
    // As it was done last time; never done, one empty set, so there is always a row to type into.
    await this.insertExerciseWithSets(workoutId, workout.userId, {
      exerciseId,
      position: await dao.nextExercisePosition(workoutId),
      restSeconds: await this.restDefault(workoutId, restSeconds),
      sets: startingSets(previous, previous.length, EMPTY_SET),
    });
    return this.require(workoutId);
  }

  async removeExercise(workoutExerciseId: string): Promise<Workout> {
    const { dao } = this.deps;
    const workoutId = await dao.workoutIdForExercise(workoutExerciseId);
    if (!workoutId) throw new Error(`No workout exercise ${workoutExerciseId}`);
    await dao.deleteExercise(workoutExerciseId);
    return this.require(workoutId);
  }

  async addSet(workoutExerciseId: string): Promise<Workout> {
    const { dao, uuid, now } = this.deps;
    const workoutId = await dao.workoutIdForExercise(workoutExerciseId);
    if (!workoutId) throw new Error(`No workout exercise ${workoutExerciseId}`);
    const workout = await dao.getWorkout(workoutId);
    const sets = await dao.setsFor(workoutId);
    const above = sets.filter((set) => set.workoutExerciseId === workoutExerciseId).at(-1);
    const timestamp = now();
    await dao.insertSets([
      {
        id: uuid(),
        userId: workout?.userId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
        workoutExerciseId,
        position: await dao.nextSetPosition(workoutExerciseId),
        weightKg: above?.weightKg ?? null,
        reps: above?.reps ?? null,
        seconds: above?.seconds ?? null,
      },
    ]);
    return this.require(workoutId);
  }

  async updateSet(setId: string, patch: SetPatch): Promise<Workout> {
    const { dao, now } = this.deps;
    const workoutId = await dao.workoutIdForSet(setId);
    if (!workoutId) throw new Error(`No set ${setId}`);
    await dao.updateSet(setId, patch, now());
    return this.require(workoutId);
  }

  async setStatus(setId: string, status: SetStatus): Promise<Workout> {
    const { dao, now } = this.deps;
    const workoutId = await dao.workoutIdForSet(setId);
    if (!workoutId) throw new Error(`No set ${setId}`);
    const fill = status === 'done' ? await this.tickFillFor(workoutId, setId) : {};
    if (!fill) throw new NothingToTickError(setId);
    const timestamp = now();
    // `completedAt` is when it was ticked; un-ticking clears it (and keeps what a tick filled in).
    await dao.updateSet(
      setId,
      { ...fill, status, completedAt: status === 'done' ? timestamp : null },
      timestamp,
    );
    return this.require(workoutId);
  }

  /**
   * What ticking a set with nothing typed in fills it with: the set above, or last time's; null when there
   * is nothing to copy and the tick is refused (tickFill).
   */
  private async tickFillFor(workoutId: string, setId: string): Promise<Partial<SetValues> | null> {
    const workout = await this.require(workoutId);
    const exercise = workout.exercises.find((one) => one.sets.some((set) => set.id === setId));
    const index = exercise?.sets.findIndex((set) => set.id === setId) ?? -1;
    const set = exercise?.sets[index];
    if (!exercise || !set || !isEmptySet(set)) return {};
    const above = exercise.sets[index - 1];
    // Last time is only read when it can matter: nothing typed in the set above either.
    if (above && !isEmptySet(above)) return tickFill(set, above, undefined);
    const owner = (await this.deps.dao.getWorkout(workoutId))?.userId ?? null;
    const lastTime = (await this.previousSets(owner, [exercise.exerciseId]))[exercise.exerciseId]?.[index];
    return tickFill(set, above, lastTime);
  }

  async removeSet(setId: string): Promise<{ workout: Workout; removed: RemovedSet }> {
    const { dao } = this.deps;
    const workoutId = await dao.workoutIdForSet(setId);
    const row = await dao.getSet(setId);
    if (!workoutId || !row) throw new Error(`No set ${setId}`);
    await dao.deleteSet(setId);
    return { workout: await this.require(workoutId), removed: { row } };
  }

  async restoreSet({ row }: RemovedSet): Promise<Workout> {
    const { dao, now } = this.deps;
    const workoutId = await dao.workoutIdForExercise(row.workoutExerciseId);
    if (!workoutId) throw new Error(`No workout exercise ${row.workoutExerciseId}`);
    const workout = await dao.getWorkout(workoutId);
    if (!workout || workout.endedAt) throw new Error(`Workout ${workoutId} is not running`);
    if (await dao.getSet(row.id)) return this.require(workoutId);
    const timestamp = now();
    await dao.makeRoomForSet(row.workoutExerciseId, row.position, timestamp);
    await dao.insertSets([{ ...row, updatedAt: timestamp }]);
    return this.require(workoutId);
  }

  async finish(workoutId: string): Promise<WorkoutDay> {
    const { dao, workoutDays, now } = this.deps;
    const row = await dao.getWorkout(workoutId);
    if (!row) throw new Error(`No workout ${workoutId}`);
    if (row.endedAt) throw new Error(`Workout ${workoutId} is already finished`);

    // The day is the unit Streak sees, so it is recomputed from every workout of that date, not just
    // this one (which `workoutsOn` includes while it is still running). A second session simply adds to it.
    const totals = await this.totalsOn(row.userId, row.date);
    const level = await this.levelOn(row.userId, row.date as ISODate, totals);

    // The day is written before the workout is closed: if writing it fails, the workout is still
    // running and Finish can be pressed again, instead of a closed workout whose day never arrives.
    const day = await workoutDays.recordDay(row.userId, row.date as ISODate, totals, level);
    const timestamp = now();
    // A past day's log was never timed: it is saved as a typical session, never as nothing.
    const endedAt = isPastLog(row.date as ISODate, row.createdAt) ? pastLogEnd(row.startedAt) : timestamp;
    await dao.finishWorkout(workoutId, endedAt, timestamp);
    return day;
  }

  async discard(workoutId: string): Promise<void> {
    await this.deps.dao.deleteWorkout(workoutId);
  }

  async deleteLogged(owner: WorkoutOwner, workoutId: string): Promise<WorkoutDay> {
    const { dao, workoutDays } = this.deps;
    const row = await dao.getWorkout(workoutId);
    // A link can name any workout on the phone; only the owner's own (a guest's, for a guest) can go.
    if (!row || row.deletedAt || row.userId !== owner) throw new Error(`No logged workout ${workoutId}`);
    if (!row.endedAt) throw new Error(`Workout ${workoutId} is still running: discard it instead`);

    // As in finish, the day is written first, from the workouts that stay: if that fails nothing has been
    // deleted and deleting can be tried again; if only the delete fails, trying again writes the same day.
    const totals = await this.totalsOn(row.userId, row.date, workoutId);
    const level = await this.levelOn(row.userId, row.date as ISODate, totals, workoutId);
    const day = await workoutDays.recordDay(row.userId, row.date as ISODate, totals, level);
    await dao.deleteWorkout(workoutId);
    return day;
  }

  async toBeat(owner: WorkoutOwner, exerciseIds: readonly string[], date: ISODate) {
    const { dao } = this.deps;
    const running = await dao.getActive(owner);
    const from = addDays(startOfWeek(date, 'mon'), -7);
    const rows = (await dao.liftSetsBetween(owner, exerciseIds, from, date)).filter(
      (one) => one.workoutId !== running?.id,
    );
    const sessions = liftSessions(rows);
    const result: Partial<Record<string, BestSet>> = {};
    for (const id of exerciseIds) {
      const then = nextMatch(id, date, sessions);
      if (then) result[id] = then;
    }
    return result;
  }

  /**
   * How dark a day is: how its lifts stood against the same lifts last week (progressive overload), over
   * every workout of that date but `without`. Only the weeks up to that day are read, so a day's level never
   * depends on what came after it, and once stored it stays.
   */
  private async levelOn(
    owner: WorkoutOwner,
    date: ISODate,
    totals: DayTotals,
    without?: string,
  ): Promise<HeatLevel> {
    const { dao } = this.deps;
    const ids = (await dao.workoutsOn(owner, date)).map((one) => one.id).filter((id) => id !== without);
    const lifts = [...new Set((await dao.exercisesOf(ids)).map((exercise) => exercise.exerciseId))];
    const from = addDays(startOfWeek(date, 'mon'), -14);
    const rows = (await dao.liftSetsBetween(owner, lifts, from, date)).filter(
      (one) => one.workoutId !== without,
    );
    const sessions = liftSessions(rows);
    const standings = sessions
      .filter((session) => session.date === date)
      .flatMap((session) => liftStanding(session, sessions) ?? []);
    return overloadLevel(standings, totals.sets > 0);
  }

  /** What a day's workouts add up to, leaving out `without` (a workout about to be deleted). */
  private async totalsOn(owner: WorkoutOwner, date: string, without?: string) {
    const { dao } = this.deps;
    const sessions = (await dao.workoutsOn(owner, date)).filter((session) => session.id !== without);
    const forVolume = await Promise.all(
      sessions.map(async (session) => ({
        bodyweightKg: session.bodyweightKg,
        sets: await dao.setsWithTypeFor(session.id),
      })),
    );
    return dayTotals(forVolume);
  }

  /**
   * Finished workouts as the lists show them. Everything is read in three queries however many workouts
   * there are (their exercises, their sets, their days), never a pair of queries per workout.
   */
  private async summarise(owner: WorkoutOwner, rows: readonly WorkoutRow[]): Promise<WorkoutSummary[]> {
    const { dao, workoutDays } = this.deps;
    const dates = rows.map((row) => row.date as ISODate).sort();
    const oldest = dates[0];
    const newest = dates.at(-1);
    if (!oldest || !newest) return [];

    const ids = rows.map((row) => row.id);
    const [exercises, sets, days] = await Promise.all([
      dao.exercisesOf(ids),
      dao.setsOf(ids),
      workoutDays.list(owner, oldest, newest),
    ]);
    const levels = new Map(days.map((day) => [day.date, day.level]));
    const setsOf = groupBy(sets, (set) => set.workoutId);
    const exercisesOf = groupBy(exercises, (exercise) => exercise.workoutId);

    return rows.map((row) => {
      const own = setsOf.get(row.id) ?? [];
      // The same volume rule as the day summary, over this one session.
      const totals = dayTotals([{ bodyweightKg: row.bodyweightKg, sets: own }]);
      const done = new Map<string, number>();
      let reps = 0;
      for (const set of own) {
        if (set.status !== 'done') continue;
        done.set(set.workoutExerciseId, (done.get(set.workoutExerciseId) ?? 0) + 1);
        // A timed set is a hold, not reps, as it adds no volume either.
        if (set.type !== 'timed') reps += set.reps ?? 0;
      }
      return {
        id: row.id,
        name: row.name,
        date: row.date as ISODate,
        startedAt: row.startedAt,
        durationSeconds: sessionSeconds(row.startedAt, row.endedAt),
        volumeKg: totals.volumeKg,
        sets: totals.sets,
        reps,
        exercises: (exercisesOf.get(row.id) ?? [])
          .map((exercise) => ({ name: exercise.name, sets: done.get(exercise.id) ?? 0 }))
          .filter((exercise) => exercise.sets > 0),
        dayLevel: levels.get(row.date as ISODate) ?? 0,
      };
    });
  }

  /** The rest the workout's exercises already use, so a new one matches them; else the person's own. */
  private async restDefault(workoutId: string, fallback: number): Promise<number> {
    const existing = await this.deps.dao.exercisesFor(workoutId);
    return existing[0]?.restSeconds ?? fallback;
  }

  private async insertExerciseWithSets(
    workoutId: string,
    owner: WorkoutOwner,
    item: {
      exerciseId: string;
      position: number;
      restSeconds: number;
      /** One entry per set, with the numbers it starts with. */
      sets: readonly PreviousSet[];
    },
  ): Promise<void> {
    const { dao, uuid, now } = this.deps;
    const timestamp = now();
    const id = uuid();
    await dao.insertExercise({
      id,
      userId: owner,
      createdAt: timestamp,
      updatedAt: timestamp,
      workoutId,
      exerciseId: item.exerciseId,
      position: item.position,
      restSeconds: item.restSeconds,
    });
    await dao.insertSets(
      item.sets.map((set, position) => ({
        id: uuid(),
        userId: owner,
        createdAt: timestamp,
        updatedAt: timestamp,
        workoutExerciseId: id,
        position,
        weightKg: set.weightKg,
        reps: set.reps,
        seconds: set.seconds,
      })),
    );
  }

  private async require(workoutId: string): Promise<Workout> {
    const workout = await this.load(workoutId);
    if (!workout) throw new Error(`No workout ${workoutId}`);
    return workout;
  }

  private async load(workoutId: string): Promise<Workout | null> {
    const { dao } = this.deps;
    const row = await dao.getWorkout(workoutId);
    if (!row || row.deletedAt) return null;

    const [exercises, sets] = await Promise.all([dao.exercisesFor(workoutId), dao.setsFor(workoutId)]);
    const byExercise = new Map<string, WorkoutSet[]>();
    for (const set of sets) {
      const list = byExercise.get(set.workoutExerciseId) ?? [];
      list.push({
        id: set.id,
        position: set.position,
        weightKg: set.weightKg,
        reps: set.reps,
        seconds: set.seconds,
        status: set.status,
        setType: set.setType,
        rpe: set.rpe,
        note: set.note,
      });
      byExercise.set(set.workoutExerciseId, list);
    }

    return {
      id: row.id,
      name: row.name,
      routineId: row.routineId,
      date: row.date as ISODate,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      bodyweightKg: row.bodyweightKg,
      ...(isPastLog(row.date as ISODate, row.createdAt) && { pastLog: true }),
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        type: exercise.type,
        restSeconds: exercise.restSeconds,
        sets: byExercise.get(exercise.id) ?? [],
      })),
    };
  }
}
