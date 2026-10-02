import type { ExerciseType, SetStatus, SetType, WorkoutRow } from '@/core/db/schema';
import type { HeatLevel } from '@/features/heatmap/domain/grid';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { WorkoutDayRepository } from '@/features/workoutDays/data/WorkoutDayRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { sessionSeconds } from '../domain/duration';
import type { ExerciseSession } from '../domain/progress';
import { newRecords, type PersonalRecord, type SetBests } from '../domain/records';
import type { PreviousSet } from '../domain/setUnits';
import { dayTotals } from '../domain/totals';
import type { WorkoutDao, WorkoutOwner } from './local/workoutDao';

export type { WorkoutOwner } from './local/workoutDao';
export type { PersonalRecord } from '../domain/records';
export type { ExerciseSession } from '../domain/progress';
export type { PreviousSet } from '../domain/setUnits';

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
}

/** A routine as the Workout tab shows it: enough to recognise and start it, nothing more. */
export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
  /** The exercise names in order, for the card's preview line. */
  exercises: string[];
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
   * The personal records a finished workout set, judged against the owner's earlier workouts. Empty for a
   * workout that is not theirs.
   */
  newRecords(owner: WorkoutOwner, workoutId: string): Promise<PersonalRecord[]>;
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
  setStatus(setId: string, status: SetStatus): Promise<Workout>;
  /**
   * Ends the workout and writes the day it belongs to: the totals cover every workout of that date, and
   * the heat level is computed from them. This is the only path by which training reaches Streak.
   */
  finish(workoutId: string): Promise<WorkoutDay>;
  /** Throws it away, exercises and sets included. */
  discard(workoutId: string): Promise<void>;
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
      startedAt: timestamp,
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
    const { dao } = this.deps;
    const rows = await dao.listRoutines(owner);
    return Promise.all(
      rows.map(async (row) => {
        const names = await dao.routineExerciseNames(row.id);
        return { id: row.id, name: row.name, exerciseCount: names.length, exercises: names };
      }),
    );
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
    const bests = await this.deps.dao.bestsBefore(owner, ids, workout.startedAt);
    const earlier: Partial<Record<string, SetBests>> = {};
    for (const { exerciseId, ...best } of bests) earlier[exerciseId] = best;
    return newRecords(workout.exercises, earlier);
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
    const timestamp = now();
    // `completedAt` is when it was ticked; un-ticking clears it.
    await dao.updateSet(setId, { status, completedAt: status === 'done' ? timestamp : null }, timestamp);
    return this.require(workoutId);
  }

  async finish(workoutId: string): Promise<WorkoutDay> {
    const { dao, workoutDays, now } = this.deps;
    const row = await dao.getWorkout(workoutId);
    if (!row) throw new Error(`No workout ${workoutId}`);
    if (row.endedAt) throw new Error(`Workout ${workoutId} is already finished`);

    // The day is the unit Streak sees, so it is recomputed from every workout of that date, not just
    // this one (which `workoutsOn` includes while it is still running). A second session simply adds to it.
    const sessions = await dao.workoutsOn(row.userId, row.date);
    const forVolume = await Promise.all(
      sessions.map(async (session) => ({
        bodyweightKg: session.bodyweightKg,
        sets: await dao.setsWithTypeFor(session.id),
      })),
    );

    // The day is written before the workout is closed: if writing it fails, the workout is still
    // running and Finish can be pressed again, instead of a closed workout whose day never arrives.
    const day = await workoutDays.recordDay(row.userId, row.date as ISODate, dayTotals(forVolume));
    const timestamp = now();
    await dao.finishWorkout(workoutId, timestamp, timestamp);
    return day;
  }

  async discard(workoutId: string): Promise<void> {
    await this.deps.dao.deleteWorkout(workoutId);
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
      for (const set of own) {
        if (set.status === 'done')
          done.set(set.workoutExerciseId, (done.get(set.workoutExerciseId) ?? 0) + 1);
      }
      return {
        id: row.id,
        name: row.name,
        date: row.date as ISODate,
        startedAt: row.startedAt,
        durationSeconds: sessionSeconds(row.startedAt, row.endedAt),
        volumeKg: totals.volumeKg,
        sets: totals.sets,
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
