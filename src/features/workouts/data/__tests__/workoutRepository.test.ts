import type { AppDatabase } from '@/core/db/types';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';

import { at, first } from '@test/fakes/at';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createWorkoutDayDao } from '@/features/workoutDays/data/local/workoutDayDao';
import type { WorkoutDayApi } from '@/features/workoutDays/data/remote/workoutDayApi';
import {
  LocalFirstWorkoutDayRepository,
  type WorkoutDayRepository,
} from '@/features/workoutDays/data/WorkoutDayRepository';
import { mockFn } from '@test/fakes/mockFn';

import { createWorkoutDao } from '../local/workoutDao';
import { LocalWorkoutRepository, type WorkoutRepository } from '../WorkoutRepository';

const DATE = '2026-10-01' as ISODate;
const USER = 'user-1';

async function setup(): Promise<{
  repo: WorkoutRepository;
  days: WorkoutDayRepository;
  db: AppDatabase;
}> {
  const db = await createTestDatabase();
  let ids = 0;
  let ticks = 0;
  const uuid = () => `id-${++ids}`;
  const now = () => new Date(Date.UTC(2026, 9, 1, 9, 0, ticks++)).toISOString();
  const api: jest.Mocked<WorkoutDayApi> = {
    upsert: mockFn<WorkoutDayApi['upsert']>(async () => undefined),
    list: mockFn<WorkoutDayApi['list']>(async () => []),
  };
  const days = new LocalFirstWorkoutDayRepository({
    dao: createWorkoutDayDao(db),
    api,
    uuid,
    now,
  });
  const repo = new LocalWorkoutRepository({ dao: createWorkoutDao(db), workoutDays: days, uuid, now });
  return { repo, days, db };
}

/** Logs one completed set of an exercise in the workout in progress. */
async function logSet(
  repo: WorkoutRepository,
  workoutId: string,
  exerciseId: string,
  patch: { weightKg?: number; reps?: number; seconds?: number },
) {
  const added = await repo.addExercise(workoutId, exerciseId, 90);
  const exercise = at(added.exercises, added.exercises.length - 1, 'exercise');
  const set = first(exercise.sets, 'set');
  await repo.updateSet(set.id, patch);
  return repo.setStatus(set.id, 'done');
}

const startEmpty = (repo: WorkoutRepository) =>
  repo.start(USER, { date: DATE, bodyweightKg: 70, restSeconds: 90 });

describe('starting a workout', () => {
  it('starts an empty workout with no exercises', async () => {
    const { repo } = await setup();

    const workout = await startEmpty(repo);

    expect(workout).toMatchObject({ name: 'Workout', routineId: null, date: DATE, bodyweightKg: 70 });
    expect(workout.exercises).toEqual([]);
  });

  it('fills a workout from a routine, in order, with its targets', async () => {
    const { repo } = await setup();

    const workout = await repo.start(USER, {
      date: DATE,
      bodyweightKg: 70,
      restSeconds: 90,
      routineId: 'push',
    });

    expect(workout.name).toBe('Push Day');
    expect(workout.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'bench-press-barbell',
      'overhead-press-barbell',
      'incline-bench-press-dumbbell',
      'lateral-raise-dumbbell',
      'triceps-pushdown-cable',
    ]);

    const bench = first(workout.exercises, 'exercise');
    expect(bench).toMatchObject({ name: 'Bench Press (Barbell)', type: 'weighted', restSeconds: 90 });
    expect(bench.sets).toHaveLength(4);
    expect(first(bench.sets)).toMatchObject({ position: 0, weightKg: 60, reps: 8, status: 'pending' });
  });

  it('gives a timed exercise seconds instead of reps', async () => {
    const { repo } = await setup();

    const workout = await repo.start(USER, {
      date: DATE,
      bodyweightKg: 70,
      restSeconds: 90,
      routineId: 'legs',
    });

    const plank = workout.exercises.find((exercise) => exercise.exerciseId === 'plank');
    expect(plank).toMatchObject({ type: 'timed' });
    expect(first(plank?.sets ?? [])).toMatchObject({ seconds: 45, reps: null, weightKg: null });
  });
});

describe('the workout in progress', () => {
  it('is the one that has not been finished', async () => {
    const { repo } = await setup();
    expect(await repo.active(USER)).toBeNull();

    const started = await startEmpty(repo);

    expect(await repo.active(USER)).toMatchObject({ id: started.id });
  });

  it('belongs to its owner, so another account never sees it', async () => {
    const { repo } = await setup();
    await startEmpty(repo);

    expect(await repo.active('someone-else')).toBeNull();
  });

  it('survives being discarded', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);

    await repo.discard(started.id);

    expect(await repo.active(USER)).toBeNull();
  });
});

describe('building up a workout', () => {
  it('adds an exercise with one empty set ready to fill', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);

    const workout = await repo.addExercise(started.id, 'squat-barbell', 90);

    expect(workout.exercises).toHaveLength(1);
    const squat = first(workout.exercises, 'exercise');
    expect(squat).toMatchObject({ exerciseId: 'squat-barbell', name: 'Squat (Barbell)' });
    expect(squat.sets).toHaveLength(1);
    expect(first(squat.sets)).toMatchObject({ position: 0, status: 'pending' });
  });

  it('adds another set below the last one', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    const added = await repo.addExercise(started.id, 'squat-barbell', 90);

    const workout = await repo.addSet(first(added.exercises, 'exercise').id);

    expect(first(workout.exercises, 'exercise').sets.map((set) => set.position)).toEqual([0, 1]);
  });

  it('records what was lifted, and ticking a set completes it', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    const added = await repo.addExercise(started.id, 'squat-barbell', 90);
    const set = first(first(added.exercises, 'exercise').sets, 'set');

    await repo.updateSet(set.id, { weightKg: 100, reps: 5 });
    const workout = await repo.setStatus(set.id, 'done');

    expect(first(first(workout.exercises, 'exercise').sets)).toMatchObject({
      weightKg: 100,
      reps: 5,
      status: 'done',
    });
  });

  it("gives the first exercise of an empty workout the person's own rest, not a fixed one", async () => {
    const { repo } = await setup();
    const started = await repo.start(USER, { date: DATE, bodyweightKg: 70, restSeconds: 120 });

    const workout = await repo.addExercise(started.id, 'squat-barbell', 120);

    expect(first(workout.exercises, 'exercise').restSeconds).toBe(120);
  });

  it('removes an exercise and its sets', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    const added = await repo.addExercise(started.id, 'squat-barbell', 90);

    const workout = await repo.removeExercise(first(added.exercises, 'exercise').id);

    expect(workout.exercises).toEqual([]);
  });
});

describe('finishing a workout', () => {
  it('records the day from what was actually completed', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });

    const day = await repo.finish(started.id);

    // No training history behind it, so the level is the "not enough days to judge" one.
    expect(day).toMatchObject({ date: DATE, volumeKg: 500, sets: 1, workouts: 1, level: 2 });
    expect(await repo.active(USER)).toBeNull();
  });

  it('counts every workout of the same day together', async () => {
    const { repo } = await setup();
    const morning = await startEmpty(repo);
    await logSet(repo, morning.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(morning.id);

    const evening = await startEmpty(repo);
    await logSet(repo, evening.id, 'bench-press-barbell', { weightKg: 60, reps: 10 });
    const day = await repo.finish(evening.id);

    expect(day).toMatchObject({ volumeKg: 1100, sets: 2, workouts: 2 });
  });

  it('records a day with nothing completed as no workout, rather than skipping it', async () => {
    const { repo, days } = await setup();
    const started = await startEmpty(repo);
    await repo.addExercise(started.id, 'squat-barbell', 90);

    const day = await repo.finish(started.id);

    expect(day).toMatchObject({ volumeKg: 0, sets: 0, workouts: 0, level: 0 });
    // The row exists, so the change still reaches Streak.
    expect(await days.list(USER, DATE, DATE)).toHaveLength(1);
  });

  it('uses the bodyweight the workout started with for bodyweight exercises', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    await logSet(repo, started.id, 'pull-up', { reps: 10 });

    const day = await repo.finish(started.id);

    expect(day.volumeKg).toBe(700);
  });

  it('leaves the workout running when the day cannot be written, so finishing can be tried again', async () => {
    const { repo, days, db } = await setup();
    const started = await startEmpty(repo);
    await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    const failing = new LocalWorkoutRepository({
      dao: createWorkoutDao(db),
      workoutDays: { ...days, recordDay: async () => Promise.reject(new Error('disk full')) },
      uuid: () => 'unused',
      now: () => new Date().toISOString(),
    });

    await expect(failing.finish(started.id)).rejects.toThrow('disk full');

    expect(await repo.active(USER)).toMatchObject({ id: started.id });
    expect(await repo.finish(started.id)).toMatchObject({ volumeKg: 500, sets: 1 });
  });

  it('refuses to finish a workout that is already done', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    await repo.finish(started.id);

    await expect(repo.finish(started.id)).rejects.toThrow();
  });
});

describe('signing in part-way through', () => {
  it("hands a guest's workout over, so it is still there afterwards", async () => {
    const { repo, db } = await setup();
    const guestWorkout = await repo.start(null, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, guestWorkout.id, 'squat-barbell', { weightKg: 100, reps: 5 });

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-01T10:00:00.000Z');

    const active = await repo.active(USER);
    expect(active).toMatchObject({ id: guestWorkout.id });
    expect(first(active?.exercises ?? [], 'exercise').sets).toHaveLength(1);
  });

  it('records the day under the new account, so it reaches Streak', async () => {
    const { repo, days, db } = await setup();
    const guestWorkout = await repo.start(null, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, guestWorkout.id, 'squat-barbell', { weightKg: 100, reps: 5 });

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-01T10:00:00.000Z');
    await repo.finish(guestWorkout.id);

    expect(await days.list(USER, DATE, DATE)).toMatchObject([{ volumeKg: 500, sets: 1, workouts: 1 }]);
    expect(await days.list(null, DATE, DATE)).toEqual([]);
  });
});

describe('the routines on offer', () => {
  it('lists the starter routines in order, with what is in each', async () => {
    const { repo } = await setup();

    const routines = await repo.routines(USER);

    expect(routines.map((routine) => routine.name)).toEqual(['Push Day', 'Pull Day', 'Leg Day']);
    expect(first(routines, 'routine')).toMatchObject({ id: 'push', exerciseCount: 5 });
    expect(first(routines, 'routine').exercises.slice(0, 2)).toEqual([
      'Bench Press (Barbell)',
      'Overhead Press (Barbell)',
    ]);
  });

  it('offers them to a guest too', async () => {
    const { repo } = await setup();

    expect(await repo.routines(null)).toHaveLength(3);
  });
});

describe('only one workout at a time', () => {
  it('refuses to start another while one is still running', async () => {
    const { repo } = await setup();
    await startEmpty(repo);

    await expect(startEmpty(repo)).rejects.toThrow(/already/i);
  });

  it('lets the next one start once the first is finished', async () => {
    const { repo } = await setup();
    const first = await startEmpty(repo);
    await repo.finish(first.id);

    const second = await startEmpty(repo);

    expect(second.id).not.toBe(first.id);
  });

  it('lets a guest start one even while another account has one running', async () => {
    const { repo } = await setup();
    await startEmpty(repo);

    await expect(repo.start(null, { date: DATE, bodyweightKg: 70, restSeconds: 90 })).resolves.toBeTruthy();
  });
});

describe('the workout feed', () => {
  it('is empty before anything has been logged', async () => {
    const { repo } = await setup();

    expect(await repo.history(USER, 10)).toEqual([]);
  });

  it('carries what the feed shows: name, exercises, volume and sets', async () => {
    const { repo } = await setup();
    const started = await repo.start(USER, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await logSet(repo, started.id, 'bench-press-barbell', { weightKg: 60, reps: 10 });
    await repo.finish(started.id);

    const [entry] = await repo.history(USER, 10);

    expect(entry).toMatchObject({
      id: started.id,
      name: 'Workout',
      date: DATE,
      volumeKg: 1100,
      sets: 2,
      exercises: [
        { name: 'Squat (Barbell)', sets: 1 },
        { name: 'Bench Press (Barbell)', sets: 1 },
      ],
    });
    expect(entry?.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('counts only the completed sets of each exercise, and leaves out one with none', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    const withSquat = await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    const squat = first(withSquat.exercises, 'exercise');
    await repo.addSet(squat.id); // added, never ticked
    await repo.addExercise(started.id, 'bench-press-barbell', 90); // never ticked at all
    await repo.finish(started.id);

    const [entry] = await repo.history(USER, 10);

    expect(entry?.exercises).toEqual([{ name: 'Squat (Barbell)', sets: 1 }]);
    expect(entry?.sets).toBe(1);
  });

  it("carries the level its day was recorded at: the colour of the day's cell", async () => {
    const { repo, days } = await setup();
    const morning = await startEmpty(repo);
    await logSet(repo, morning.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(morning.id);
    const evening = await startEmpty(repo);
    await logSet(repo, evening.id, 'bench-press-barbell', { weightKg: 60, reps: 10 });
    await repo.finish(evening.id);

    const [day] = await days.list(USER, DATE, DATE);
    const entries = await repo.history(USER, 10);

    // Read back, never recomputed: both workouts of the day carry the day's one frozen level.
    expect(entries.map((entry) => entry.dayLevel)).toEqual([day?.level, day?.level]);
  });

  it('leaves out the workout still in progress', async () => {
    const { repo } = await setup();
    const done = await startEmpty(repo);
    await logSet(repo, done.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(done.id);
    await startEmpty(repo);

    expect(await repo.history(USER, 10)).toHaveLength(1);
  });

  it('puts the most recent first and honours the limit', async () => {
    const { repo } = await setup();
    const older = await repo.start(USER, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, older.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(older.id);
    const newer = await repo.start(USER, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, newer.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(newer.id);

    expect((await repo.history(USER, 10)).map((entry) => entry.id)).toEqual([newer.id, older.id]);
    expect(await repo.history(USER, 1)).toHaveLength(1);
  });

  it('shows each owner only their own', async () => {
    const { repo } = await setup();
    const mine = await startEmpty(repo);
    await logSet(repo, mine.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(mine.id);

    expect(await repo.history('someone-else', 10)).toEqual([]);
  });
});

describe('a session where nothing was completed', () => {
  it('is not a workout, so the feed leaves it out', async () => {
    const { repo } = await setup();
    const empty = await startEmpty(repo);
    await repo.addExercise(empty.id, 'squat-barbell', 90);
    await repo.finish(empty.id);
    const real = await startEmpty(repo);
    await logSet(repo, real.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(real.id);

    expect((await repo.history(USER, 10)).map((entry) => entry.id)).toEqual([real.id]);
  });

  it('does not use up the limit, so the feed still fills', async () => {
    const { repo } = await setup();
    const real = await startEmpty(repo);
    await logSet(repo, real.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(real.id);
    for (let i = 0; i < 3; i += 1) {
      const empty = await startEmpty(repo);
      await repo.finish(empty.id);
    }

    // Three newer empty sessions must not push the real one past a limit of one.
    expect((await repo.history(USER, 1)).map((entry) => entry.id)).toEqual([real.id]);
  });
});

describe('the workouts of a range of days (a day, or the Calendar)', () => {
  /** A finished workout on `date` with one completed set. */
  async function logWorkout(repo: WorkoutRepository, date: string, owner: string | null = USER) {
    const started = await repo.start(owner, { date: date as ISODate, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(started.id);
    return started.id;
  }

  it('lists the finished workouts dated within it, newest first', async () => {
    const { repo } = await setup();
    const older = await logWorkout(repo, '2026-09-28');
    const newer = await logWorkout(repo, '2026-09-30');
    await logWorkout(repo, '2026-10-01');

    const entries = await repo.historyBetween(USER, '2026-09-28' as ISODate, '2026-09-30' as ISODate);

    expect(entries.map((entry) => entry.id)).toEqual([newer, older]);
  });

  it('orders by the day first, even when a later start was logged under an earlier day', async () => {
    // A clock or time-zone change can date a later session to an earlier day; months must not interleave.
    const { repo } = await setup();
    const september30 = await logWorkout(repo, '2026-09-30');
    const october1 = await logWorkout(repo, '2026-10-01');
    const september28 = await logWorkout(repo, '2026-09-28');

    const entries = await repo.historyBetween(USER, '2026-09-01' as ISODate, '2026-10-31' as ISODate);

    expect(entries.map((entry) => entry.id)).toEqual([october1, september30, september28]);
  });

  it("is one day's workouts when the range is that day", async () => {
    const { repo } = await setup();
    await logWorkout(repo, '2026-09-29');
    const mine = await logWorkout(repo, '2026-09-30');

    const entries = await repo.historyBetween(USER, '2026-09-30' as ISODate, '2026-09-30' as ISODate);

    expect(entries).toMatchObject([{ id: mine, date: '2026-09-30', sets: 1, volumeKg: 500 }]);
  });

  it('leaves out the workout in progress, empty sessions, and other people', async () => {
    const { repo } = await setup();
    const real = await logWorkout(repo, DATE);
    const empty = await startEmpty(repo);
    await repo.finish(empty.id);
    await startEmpty(repo);
    await logWorkout(repo, DATE, null);

    expect((await repo.historyBetween(USER, DATE, DATE)).map((entry) => entry.id)).toEqual([real]);
  });

  it('is empty for a day with nothing logged', async () => {
    const { repo } = await setup();

    expect(await repo.historyBetween(USER, DATE, DATE)).toEqual([]);
  });

  it('reads many workouts at once without mixing up their sets', async () => {
    const { repo } = await setup();
    for (let day = 1; day <= 12; day += 1) await logWorkout(repo, `2026-09-${String(day).padStart(2, '0')}`);

    const entries = await repo.historyBetween(USER, '2026-09-01' as ISODate, '2026-09-30' as ISODate);

    expect(entries).toHaveLength(12);
    for (const entry of entries) {
      expect(entry).toMatchObject({
        sets: 1,
        volumeKg: 500,
        exercises: [{ name: 'Squat (Barbell)', sets: 1 }],
      });
    }
  });
});

describe('one logged workout, opened from a link', () => {
  async function logWorkout(repo: WorkoutRepository, owner: string | null) {
    const started = await repo.start(owner, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
    await logSet(repo, started.id, 'squat-barbell', { weightKg: 100, reps: 5 });
    await repo.finish(started.id);
    return started.id;
  }

  it('is read by the person who logged it', async () => {
    const { repo } = await setup();
    const id = await logWorkout(repo, USER);

    expect(await repo.logged(USER, id)).toMatchObject({ id, name: expect.any(String) });
  });

  it('is nothing to anyone else on the phone, a guest included', async () => {
    const { repo } = await setup();
    const mine = await logWorkout(repo, USER);
    const guests = await logWorkout(repo, null);

    expect(await repo.logged('user-2', mine)).toBeNull();
    expect(await repo.logged(null, mine)).toBeNull();
    expect(await repo.logged(USER, guests)).toBeNull();
  });

  it('is nothing for an id that was never logged', async () => {
    const { repo } = await setup();

    expect(await repo.logged(USER, 'missing')).toBeNull();
  });
});

interface SetInput {
  weightKg?: number | null;
  reps?: number | null;
  seconds?: number | null;
  setType?: 'normal' | 'warmup';
  /** Ticked, unless said otherwise. */
  done?: boolean;
}

/** Adds an exercise to the workout in progress and fills its sets as given, in order. */
async function logExercise(repo: WorkoutRepository, workoutId: string, exerciseId: string, sets: SetInput[]) {
  let workout = await repo.addExercise(workoutId, exerciseId, 90);
  const entry = () => at(workout.exercises, workout.exercises.length - 1, 'exercise');
  while (entry().sets.length < sets.length) workout = await repo.addSet(entry().id);
  for (const [index, { done = true, ...patch }] of sets.entries()) {
    const set = at(entry().sets, index, 'set');
    workout = await repo.updateSet(set.id, { weightKg: null, reps: null, seconds: null, ...patch });
    if (done) workout = await repo.setStatus(set.id, 'done');
  }
  return workout;
}

/** A whole workout, started, logged and finished: `[exerciseId, sets]` in order. */
async function logged(
  repo: WorkoutRepository,
  exercises: [string, SetInput[]][],
  owner: string | null = USER,
): Promise<string> {
  const started = await repo.start(owner, { date: DATE, bodyweightKg: 70, restSeconds: 90 });
  for (const [exerciseId, sets] of exercises) await logExercise(repo, started.id, exerciseId, sets);
  await repo.finish(started.id);
  return started.id;
}

const BENCH = 'bench-press-barbell';
const SQUAT = 'squat-barbell';

describe('what each exercise was last time', () => {
  it('is nothing for an exercise never logged', async () => {
    const { repo } = await setup();

    expect(await repo.previousSets(USER, [BENCH])).toEqual({});
  });

  it('is the completed sets of the latest finished workout with it, in order', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 50, reps: 10 }]]]);
    await logged(repo, [
      [
        BENCH,
        [
          { weightKg: 60, reps: 8 },
          { weightKg: 62.5, reps: 6 },
          { weightKg: 65, reps: 4, done: false },
        ],
      ],
    ]);

    expect(await repo.previousSets(USER, [BENCH])).toEqual({
      [BENCH]: [
        { weightKg: 60, reps: 8, seconds: null },
        { weightKg: 62.5, reps: 6, seconds: null },
      ],
    });
  });

  it('passes over a workout where it was added but never completed', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 50, reps: 10 }]]]);
    await logged(repo, [
      [BENCH, [{ weightKg: 60, reps: 8, done: false }]],
      [SQUAT, [{ weightKg: 100, reps: 5 }]],
    ]);

    expect((await repo.previousSets(USER, [BENCH, SQUAT]))[BENCH]).toEqual([
      { weightKg: 50, reps: 10, seconds: null },
    ]);
  });

  it('leaves out the workout in progress, and anyone else’s', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 50, reps: 10 }]]]);
    await logged(repo, [[BENCH, [{ weightKg: 90, reps: 3 }]]], null);
    const running = await startEmpty(repo);
    await logExercise(repo, running.id, BENCH, [{ weightKg: 70, reps: 5 }]);

    expect((await repo.previousSets(USER, [BENCH]))[BENCH]).toEqual([
      { weightKg: 50, reps: 10, seconds: null },
    ]);
  });
});

describe('starting from last time', () => {
  it('adds an exercise as it was done last time: as many sets, the same weights and reps', async () => {
    const { repo } = await setup();
    await logged(repo, [
      [
        BENCH,
        [
          { weightKg: 60, reps: 8 },
          { weightKg: 62.5, reps: 6 },
        ],
      ],
    ]);
    const started = await startEmpty(repo);

    const workout = await repo.addExercise(started.id, BENCH, 90);

    expect(first(workout.exercises, 'exercise').sets).toMatchObject([
      { weightKg: 60, reps: 8, status: 'pending' },
      { weightKg: 62.5, reps: 6, status: 'pending' },
    ]);
  });

  it("keeps a routine's number of sets, filled from last time where there is one", async () => {
    const { repo } = await setup();
    await logged(repo, [
      [
        BENCH,
        [
          { weightKg: 70, reps: 5 },
          { weightKg: 72.5, reps: 4 },
        ],
      ],
    ]);

    const workout = await repo.start(USER, {
      date: DATE,
      bodyweightKg: 70,
      restSeconds: 90,
      routineId: 'push',
    });

    const [bench, press] = workout.exercises;
    expect(bench?.sets.map((set) => [set.weightKg, set.reps])).toEqual([
      [70, 5],
      [72.5, 4],
      [72.5, 4],
      [72.5, 4],
    ]);
    // Never done before: the routine's own targets.
    expect(first(press?.sets ?? [])).toMatchObject({ weightKg: 40, reps: 8 });
  });

  it('adds another set with the weight and reps of the one above', async () => {
    const { repo } = await setup();
    const started = await startEmpty(repo);
    const added = await repo.addExercise(started.id, SQUAT, 90);
    const squat = first(added.exercises, 'exercise');
    await repo.updateSet(first(squat.sets, 'set').id, { weightKg: 100, reps: 5 });

    const workout = await repo.addSet(squat.id);

    expect(first(workout.exercises, 'exercise').sets).toMatchObject([
      { weightKg: 100, reps: 5 },
      { weightKg: 100, reps: 5, status: 'pending' },
    ]);
  });
});

describe('the records a workout set', () => {
  it('counts the first time an exercise is done', async () => {
    const { repo } = await setup();

    const id = await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);

    expect(await repo.newRecords(USER, id)).toEqual([
      { exerciseId: BENCH, name: 'Bench Press (Barbell)', type: 'weighted', value: 60 },
    ]);
  });

  it('is a record only when it beats every earlier workout', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);

    const same = await logged(repo, [
      [BENCH, [{ weightKg: 60, reps: 10 }]],
      [SQUAT, [{ weightKg: 100, reps: 5 }]],
    ]);
    const heavier = await logged(repo, [[BENCH, [{ weightKg: 62.5, reps: 5 }]]]);

    expect((await repo.newRecords(USER, same)).map((record) => record.exerciseId)).toEqual([SQUAT]);
    expect(await repo.newRecords(USER, heavier)).toMatchObject([{ exerciseId: BENCH, value: 62.5 }]);
  });

  it('leaves out warm-ups and unticked sets, then and now', async () => {
    const { repo } = await setup();
    await logged(repo, [
      [
        BENCH,
        [
          { weightKg: 60, reps: 8 },
          { weightKg: 120, reps: 1, setType: 'warmup' },
        ],
      ],
    ]);

    const id = await logged(repo, [
      [
        BENCH,
        [
          { weightKg: 80, reps: 5, setType: 'warmup' },
          { weightKg: 100, reps: 1, done: false },
        ],
      ],
    ]);

    expect(await repo.newRecords(USER, id)).toEqual([]);
  });

  it('measures a bodyweight exercise by reps and a timed one by its hold', async () => {
    const { repo } = await setup();
    await logged(repo, [
      ['pull-up', [{ reps: 10 }]],
      ['plank', [{ seconds: 60 }]],
    ]);

    const id = await logged(repo, [
      ['pull-up', [{ reps: 12 }]],
      ['plank', [{ seconds: 45 }]],
    ]);

    expect(await repo.newRecords(USER, id)).toMatchObject([
      { exerciseId: 'pull-up', type: 'bodyweight', value: 12 },
    ]);
  });

  it("is judged against the person's own workouts only, and shown only to them", async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 100, reps: 5 }]]], null);

    const id = await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);

    expect(await repo.newRecords(USER, id)).toMatchObject([{ exerciseId: BENCH, value: 60 }]);
    expect(await repo.newRecords(null, id)).toEqual([]);
  });
});

describe('the history of one exercise', () => {
  it('is every finished workout it was completed in, the latest first, with its completed sets', async () => {
    const { repo } = await setup();
    const earlier = await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);
    const later = await logged(repo, [
      [SQUAT, [{ weightKg: 100, reps: 5 }]],
      [
        BENCH,
        [
          { weightKg: 62.5, reps: 5 },
          { weightKg: 65, reps: 3, done: false },
        ],
      ],
    ]);

    const history = await repo.exerciseHistory(USER, BENCH);

    expect(history.map((session) => session.workoutId)).toEqual([later, earlier]);
    expect(history[0]).toMatchObject({ name: 'Workout', date: DATE });
    expect(history[0]?.sets).toEqual([
      { status: 'done', setType: 'normal', weightKg: 62.5, reps: 5, seconds: null },
    ]);
  });

  it("leaves out the workout in progress, and anyone else's", async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 90, reps: 3 }]]], null);
    const running = await startEmpty(repo);
    await logExercise(repo, running.id, BENCH, [{ weightKg: 70, reps: 5 }]);

    expect(await repo.exerciseHistory(USER, BENCH)).toEqual([]);
  });
});

describe("each exercise's records as they stand", () => {
  it('takes the best of every finished workout, the latest included', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 60, reps: 10 }]]]);
    await logged(repo, [[BENCH, [{ weightKg: 65, reps: 5 }]]]);

    expect(await repo.bests(USER, [BENCH, SQUAT])).toEqual({
      [BENCH]: { weightKg: 65, reps: 10, seconds: null },
    });
  });

  it('leaves out the workout still in progress', async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);
    const running = await startEmpty(repo);
    await logSet(repo, running.id, BENCH, { weightKg: 100, reps: 1 });

    expect(await repo.bests(USER, [BENCH])).toMatchObject({ [BENCH]: { weightKg: 60 } });
  });

  it("is the person's own: a guest's workouts on the same phone do not count", async () => {
    const { repo } = await setup();
    await logged(repo, [[BENCH, [{ weightKg: 100, reps: 5 }]]], null);
    await logged(repo, [[BENCH, [{ weightKg: 60, reps: 8 }]]]);

    expect(await repo.bests(USER, [BENCH])).toMatchObject({ [BENCH]: { weightKg: 60 } });
    expect(await repo.bests(null, [BENCH])).toMatchObject({ [BENCH]: { weightKg: 100 } });
  });
});
