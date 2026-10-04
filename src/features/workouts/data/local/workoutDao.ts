import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  max,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import {
  exercises,
  routineExercises,
  routines,
  workoutExercises,
  workouts,
  workoutSets,
  type ExerciseType,
  type NewWorkoutExerciseRow,
  type NewWorkoutRow,
  type NewWorkoutSetRow,
  type RoutineExerciseRow,
  type RoutineRow,
  type SetStatus,
  type SetType,
  type WorkoutRow,
  type WorkoutSetRow,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A signed-in user's id, or null for a workout started in guest mode. */
export type WorkoutOwner = string | null;

/** A set reduced to what the day's volume needs, with how its exercise is measured. */
export interface SetWithType {
  status: SetStatus;
  weightKg: number | null;
  reps: number | null;
  type: ExerciseType;
}

/** A workout's exercise, with the bits of the exercise itself the screen needs. */
export interface WorkoutExerciseWithName {
  id: string;
  exerciseId: string;
  position: number;
  restSeconds: number;
  name: string;
  type: ExerciseType;
}

/** A set read alongside other workouts' sets: which workout and exercise it belongs to. */
export interface SetOfWorkout extends SetWithType {
  workoutId: string;
  workoutExerciseId: string;
}

/** A completed set of an exercise, from the workout it was last finished in. */
export interface LastSet {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/** The best of each measure an exercise reached, over many workouts (see `SetBests` in the domain). */
export interface ExerciseBests {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/** A completed set of one exercise, with the finished workout it was done in. */
export interface ExerciseSetRow {
  workoutId: string;
  name: string;
  date: string;
  startedAt: string;
  status: SetStatus;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

/**
 * Data source: the workout tables, plus the read-only lookups needed to build a workout (an exercise's
 * name and type, a routine's items). Local only — none of this leaves the phone.
 */
export interface WorkoutDao {
  /** The workout that has not been finished yet, if there is one. */
  getActive(owner: WorkoutOwner): Promise<WorkoutRow | null>;
  getWorkout(id: string): Promise<WorkoutRow | null>;
  /** Every workout of one day, finished or not: what the day's totals are built from. */
  workoutsOn(owner: WorkoutOwner, date: string): Promise<WorkoutRow[]>;
  /** Finished workouts with at least one completed set, most recent first: the Home feed. */
  finishedWorkouts(owner: WorkoutOwner, limit: number): Promise<WorkoutRow[]>;
  /** The same, dated within the range (inclusive): one day's workouts, or the Calendar's. */
  finishedWorkoutsBetween(owner: WorkoutOwner, from: string, to: string): Promise<WorkoutRow[]>;
  insertWorkout(row: NewWorkoutRow): Promise<void>;
  finishWorkout(id: string, endedAt: string, updatedAt: string): Promise<void>;
  /** Discards a workout outright; its exercises and sets go with it. */
  deleteWorkout(id: string): Promise<void>;

  /** Starter routines and the owner's own, in the order they are shown. */
  listRoutines(owner: WorkoutOwner): Promise<RoutineRow[]>;
  getRoutine(id: string): Promise<RoutineRow | null>;
  /** The exercise names of each routine, in one read: by routine, then in order. */
  routineExerciseNames(routineIds: readonly string[]): Promise<{ routineId: string; name: string }[]>;
  /** A routine's exercises, in the order they are performed. */
  routineItems(routineId: string): Promise<RoutineExerciseRow[]>;

  insertExercise(row: NewWorkoutExerciseRow): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  /** A workout's exercises in order, each with its name and how it is measured. */
  exercisesFor(workoutId: string): Promise<WorkoutExerciseWithName[]>;
  nextExercisePosition(workoutId: string): Promise<number>;

  insertSets(rows: readonly NewWorkoutSetRow[]): Promise<void>;
  /** Every set of a workout, oldest exercise first and in set order within each. */
  setsFor(workoutId: string): Promise<WorkoutSetRow[]>;
  /** The same sets, carrying how each one is measured. */
  setsWithTypeFor(workoutId: string): Promise<SetWithType[]>;
  /**
   * The exercises and the sets of many workouts, each in one read, so a list of summaries costs the same
   * few queries however long it is.
   */
  exercisesOf(workoutIds: readonly string[]): Promise<(WorkoutExerciseWithName & { workoutId: string })[]>;
  setsOf(workoutIds: readonly string[]): Promise<SetOfWorkout[]>;
  updateSet(id: string, patch: Partial<NewWorkoutSetRow>, updatedAt: string): Promise<void>;
  nextSetPosition(workoutExerciseId: string): Promise<number>;

  /**
   * For each exercise, the completed sets of the latest finished workout that has any, in the order
   * they were done. Two reads however many exercises: the latest start of each, then those sets.
   */
  lastDoneSets(owner: WorkoutOwner, exerciseIds: readonly string[]): Promise<LastSet[]>;
  /**
   * The best weight (lifted at least once), reps and hold of each exercise across the owner's finished
   * workouts, or only those started before `before` when it is given. Completed sets only, warm-ups left
   * out: the domain's record rule.
   */
  bests(owner: WorkoutOwner, exerciseIds: readonly string[], before?: string): Promise<ExerciseBests[]>;

  /**
   * Every completed set of one exercise across the owner's finished workouts, the latest workout first
   * and in the order done within it: an exercise's history.
   */
  exerciseSets(owner: WorkoutOwner, exerciseId: string): Promise<ExerciseSetRow[]>;

  /** Which workout a set or an exercise belongs to, so a change can reload it. */
  workoutIdForSet(setId: string): Promise<string | null>;
  workoutIdForExercise(workoutExerciseId: string): Promise<string | null>;
}

const live = isNull(workouts.deletedAt);

/** Ids per `IN (…)`: well under SQLite's bound-parameter limit, however long the history grows. */
const IDS_PER_QUERY = 500;

function inChunks<T>(ids: readonly string[], read: (chunk: string[]) => T[]): T[] {
  const rows: T[] = [];
  for (let start = 0; start < ids.length; start += IDS_PER_QUERY) {
    rows.push(...read(ids.slice(start, start + IDS_PER_QUERY)));
  }
  return rows;
}

export function createWorkoutDao(db: AppDatabase): WorkoutDao {
  const ownedBy = (owner: WorkoutOwner) =>
    owner === null ? isNull(workouts.userId) : eq(workouts.userId, owner);
  // A session where nothing was completed is not a workout (the day totals already say so), so lists
  // leave it out in SQL — filtering afterwards would let empty sessions use up a limit.
  const somethingDone = () =>
    exists(
      db
        .select({ id: workoutSets.id })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .where(and(eq(workoutExercises.workoutId, workouts.id), eq(workoutSets.status, 'done'))),
    );

  return {
    async getActive(owner) {
      return (
        db
          .select()
          .from(workouts)
          .where(and(ownedBy(owner), isNull(workouts.endedAt), live))
          .orderBy(asc(workouts.startedAt))
          .get() ?? null
      );
    },

    async getWorkout(id) {
      return db.select().from(workouts).where(eq(workouts.id, id)).get() ?? null;
    },

    async workoutsOn(owner, date) {
      return db
        .select()
        .from(workouts)
        .where(and(ownedBy(owner), eq(workouts.date, date), live))
        .orderBy(asc(workouts.startedAt))
        .all();
    },

    async insertWorkout(row) {
      db.insert(workouts).values(row).run();
    },

    async finishWorkout(id, endedAt, updatedAt) {
      db.update(workouts).set({ endedAt, updatedAt }).where(eq(workouts.id, id)).run();
    },

    async deleteWorkout(id) {
      db.delete(workouts).where(eq(workouts.id, id)).run();
    },

    async listRoutines(owner) {
      // Seeded routines have no owner, so a guest gets them too.
      const visible =
        owner === null ? isNull(routines.userId) : or(isNull(routines.userId), eq(routines.userId, owner));
      return db
        .select()
        .from(routines)
        .where(and(visible, isNull(routines.deletedAt)))
        .orderBy(asc(routines.position))
        .all();
    },

    async routineExerciseNames(routineIds) {
      if (routineIds.length === 0) return [];
      return db
        .select({ routineId: routineExercises.routineId, name: exercises.name })
        .from(routineExercises)
        .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
        .where(inArray(routineExercises.routineId, [...routineIds]))
        .orderBy(asc(routineExercises.routineId), asc(routineExercises.position))
        .all();
    },

    async getRoutine(id) {
      return db.select().from(routines).where(eq(routines.id, id)).get() ?? null;
    },

    async routineItems(routineId) {
      return db
        .select()
        .from(routineExercises)
        .where(eq(routineExercises.routineId, routineId))
        .orderBy(asc(routineExercises.position))
        .all();
    },

    async insertExercise(row) {
      db.insert(workoutExercises).values(row).run();
    },

    async deleteExercise(id) {
      db.delete(workoutExercises).where(eq(workoutExercises.id, id)).run();
    },

    async exercisesFor(workoutId) {
      return db
        .select({
          id: workoutExercises.id,
          exerciseId: workoutExercises.exerciseId,
          position: workoutExercises.position,
          restSeconds: workoutExercises.restSeconds,
          name: exercises.name,
          type: exercises.type,
        })
        .from(workoutExercises)
        .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
        .where(eq(workoutExercises.workoutId, workoutId))
        .orderBy(asc(workoutExercises.position))
        .all();
    },

    async nextExercisePosition(workoutId) {
      const rows = db
        .select({ position: workoutExercises.position })
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, workoutId))
        .all();
      return rows.reduce((next, row) => Math.max(next, row.position + 1), 0);
    },

    async insertSets(rows) {
      if (rows.length === 0) return;
      db.insert(workoutSets)
        .values([...rows])
        .run();
    },

    async setsFor(workoutId) {
      return db
        .select({ set: workoutSets })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .where(eq(workoutExercises.workoutId, workoutId))
        .orderBy(asc(workoutExercises.position), asc(workoutSets.position))
        .all()
        .map((row) => row.set);
    },

    async finishedWorkouts(owner, limit) {
      return db
        .select()
        .from(workouts)
        .where(and(ownedBy(owner), isNotNull(workouts.endedAt), live, somethingDone()))
        .orderBy(desc(workouts.startedAt))
        .limit(limit)
        .all();
    },

    async finishedWorkoutsBetween(owner, from, to) {
      return db
        .select()
        .from(workouts)
        .where(
          and(
            ownedBy(owner),
            gte(workouts.date, from),
            lte(workouts.date, to),
            isNotNull(workouts.endedAt),
            live,
            somethingDone(),
          ),
        )
        .orderBy(desc(workouts.date), desc(workouts.startedAt))
        .all();
    },

    async exercisesOf(workoutIds) {
      return inChunks(workoutIds, (chunk) =>
        db
          .select({
            id: workoutExercises.id,
            workoutId: workoutExercises.workoutId,
            exerciseId: workoutExercises.exerciseId,
            position: workoutExercises.position,
            restSeconds: workoutExercises.restSeconds,
            name: exercises.name,
            type: exercises.type,
          })
          .from(workoutExercises)
          .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
          .where(inArray(workoutExercises.workoutId, chunk))
          .orderBy(asc(workoutExercises.workoutId), asc(workoutExercises.position))
          .all(),
      );
    },

    async setsOf(workoutIds) {
      return inChunks(workoutIds, (chunk) =>
        db
          .select({
            workoutId: workoutExercises.workoutId,
            workoutExerciseId: workoutSets.workoutExerciseId,
            status: workoutSets.status,
            weightKg: workoutSets.weightKg,
            reps: workoutSets.reps,
            type: exercises.type,
          })
          .from(workoutSets)
          .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
          .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
          .where(inArray(workoutExercises.workoutId, chunk))
          .all(),
      );
    },

    async setsWithTypeFor(workoutId) {
      return db
        .select({
          status: workoutSets.status,
          weightKg: workoutSets.weightKg,
          reps: workoutSets.reps,
          type: exercises.type,
        })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
        .where(eq(workoutExercises.workoutId, workoutId))
        .all();
    },

    async updateSet(id, patch, updatedAt) {
      db.update(workoutSets)
        .set({ ...patch, updatedAt })
        .where(eq(workoutSets.id, id))
        .run();
    },

    async nextSetPosition(workoutExerciseId) {
      const rows = db
        .select({ position: workoutSets.position })
        .from(workoutSets)
        .where(eq(workoutSets.workoutExerciseId, workoutExerciseId))
        .all();
      return rows.reduce((next, row) => Math.max(next, row.position + 1), 0);
    },

    async lastDoneSets(owner, exerciseIds) {
      if (exerciseIds.length === 0) return [];
      const completedIn = and(
        ownedBy(owner),
        isNotNull(workouts.endedAt),
        live,
        eq(workoutSets.status, 'done'),
        inArray(workoutExercises.exerciseId, [...exerciseIds]),
      );
      const latest = db
        .select({ exerciseId: workoutExercises.exerciseId, startedAt: max(workouts.startedAt) })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(completedIn)
        .groupBy(workoutExercises.exerciseId)
        .all();
      const latestOf = new Map(latest.map((row) => [row.exerciseId, row.startedAt]));
      const starts = [...new Set(latestOf.values())].filter((start) => start !== null);
      if (starts.length === 0) return [];

      return db
        .select({
          exerciseId: workoutExercises.exerciseId,
          startedAt: workouts.startedAt,
          weightKg: workoutSets.weightKg,
          reps: workoutSets.reps,
          seconds: workoutSets.seconds,
        })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(and(completedIn, inArray(workouts.startedAt, starts)))
        .orderBy(asc(workoutExercises.position), asc(workoutSets.position))
        .all()
        .filter((row) => latestOf.get(row.exerciseId) === row.startedAt)
        .map(({ exerciseId, weightKg, reps, seconds }) => ({ exerciseId, weightKg, reps, seconds }));
    },

    async bests(owner, exerciseIds, before) {
      if (exerciseIds.length === 0) return [];
      return db
        .select({
          exerciseId: workoutExercises.exerciseId,
          // A weight counts only when it was lifted at least once, as `setBests` has it.
          weightKg: sql<
            number | null
          >`max(case when ${workoutSets.reps} > 0 then ${workoutSets.weightKg} end)`,
          reps: max(workoutSets.reps),
          seconds: max(workoutSets.seconds),
        })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(
          and(
            ownedBy(owner),
            isNotNull(workouts.endedAt),
            live,
            before === undefined ? undefined : lt(workouts.startedAt, before),
            eq(workoutSets.status, 'done'),
            ne(workoutSets.setType, 'warmup'),
            inArray(workoutExercises.exerciseId, [...exerciseIds]),
          ),
        )
        .groupBy(workoutExercises.exerciseId)
        .all();
    },

    async exerciseSets(owner, exerciseId) {
      return db
        .select({
          workoutId: workouts.id,
          name: workouts.name,
          date: workouts.date,
          startedAt: workouts.startedAt,
          status: workoutSets.status,
          setType: workoutSets.setType,
          weightKg: workoutSets.weightKg,
          reps: workoutSets.reps,
          seconds: workoutSets.seconds,
        })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(
          and(
            ownedBy(owner),
            isNotNull(workouts.endedAt),
            live,
            eq(workoutSets.status, 'done'),
            eq(workoutExercises.exerciseId, exerciseId),
          ),
        )
        .orderBy(desc(workouts.startedAt), asc(workoutExercises.position), asc(workoutSets.position))
        .all();
    },

    async workoutIdForSet(setId) {
      const row = db
        .select({ workoutId: workoutExercises.workoutId })
        .from(workoutSets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
        .where(eq(workoutSets.id, setId))
        .get();
      return row?.workoutId ?? null;
    },

    async workoutIdForExercise(workoutExerciseId) {
      const row = db
        .select({ workoutId: workoutExercises.workoutId })
        .from(workoutExercises)
        .where(eq(workoutExercises.id, workoutExerciseId))
        .get();
      return row?.workoutId ?? null;
    },
  };
}
