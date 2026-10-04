import { exerciseFavourites, exercises, workoutExercises, workouts, workoutSets } from '@/core/db/schema';
import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import type { AppDatabase } from '@/core/db/types';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createExerciseDao } from '../local/exerciseDao';
import { LocalExerciseRepository, type ExerciseRepository } from '../ExerciseRepository';

const USER = 'user-1';

async function setup(): Promise<{ db: AppDatabase; repo: ExerciseRepository }> {
  const db = await createTestDatabase();
  let ids = 0;
  let ticks = 0;
  const repo = new LocalExerciseRepository({
    dao: createExerciseDao(db),
    uuid: () => `fav-${++ids}`,
    now: () => new Date(Date.UTC(2026, 9, 1, 9, 0, ticks++)).toISOString(),
  });
  return { db, repo };
}

const custom = (id: string, name: string, userId: string | null) => ({
  id,
  userId,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  name,
  equipment: 'barbell' as const,
  primaryMuscle: 'chest' as const,
  secondaryMuscles: [],
  type: 'weighted' as const,
  isCompound: true,
  isCustom: true,
});

/** The built-in library (migration 0001) and the open exercise dataset (0004), as 0005 curates them. */
const LIBRARY_SIZE = 624;

describe('the exercise library', () => {
  it('offers the curated library, in alphabetical order', async () => {
    const { repo } = await setup();

    const all = await repo.list(USER);

    expect(all).toHaveLength(LIBRARY_SIZE);
    expect(all.map((row) => row.name)).toEqual([...all.map((row) => row.name)].sort());
  });

  it('includes custom exercises alongside the built-in ones', async () => {
    const { db, repo } = await setup();
    db.insert(exercises)
      .values(custom('mine', 'Zercher Squat', USER))
      .run();

    const all = await repo.list(USER);

    expect(all).toHaveLength(LIBRARY_SIZE + 1);
    expect(all.some((row) => row.id === 'mine')).toBe(true);
  });

  it('hides exercises belonging to someone else', async () => {
    const { db, repo } = await setup();
    db.insert(exercises)
      .values(custom('theirs', 'Secret Lift', 'user-2'))
      .run();

    const all = await repo.list(USER);

    expect(all.some((row) => row.id === 'theirs')).toBe(false);
  });

  it('still offers the built-in exercises to a guest', async () => {
    const { repo } = await setup();

    expect(await repo.list(null)).toHaveLength(LIBRARY_SIZE);
  });

  it('searches the library by name, muscle or equipment', async () => {
    const { repo } = await setup();

    const found = await repo.search(USER, 'ohp');

    // The library's own overhead press first, then the other shoulder presses: it is one movement.
    expect(found.slice(0, 3).map((row) => row.id)).toEqual([
      'overhead-press-barbell',
      'shoulder-press-dumbbell',
      'shoulder-press-machine',
    ]);
    for (const row of found) expect(row).toMatchObject({ name: expect.stringMatching(/press/i) });
    expect(found.every((row) => row.primaryMuscle === 'shoulders')).toBe(true);
  });

  it('looks one up by id', async () => {
    const { repo } = await setup();

    expect(await repo.get('plank')).toMatchObject({ name: 'Plank', type: 'timed' });
    expect(await repo.get('nope')).toBeNull();
  });
});

const STAMP = '2026-10-01T00:00:00.000Z';

/** A workout written straight to the tables: `done` exercises have a completed set, the rest do not. */
function workoutWith(
  db: AppDatabase,
  id: string,
  owner: string | null,
  startedAt: string,
  { done = [], undone = [], finished = true }: { done?: string[]; undone?: string[]; finished?: boolean },
) {
  db.insert(workouts)
    .values({
      id,
      userId: owner,
      createdAt: STAMP,
      updatedAt: STAMP,
      name: 'Workout',
      date: startedAt.slice(0, 10),
      startedAt,
      endedAt: finished ? startedAt : null,
      bodyweightKg: 70,
    })
    .run();
  for (const [position, exerciseId] of [...done, ...undone].entries()) {
    const entry = `${id}-${exerciseId}`;
    db.insert(workoutExercises)
      .values({
        id: entry,
        userId: owner,
        createdAt: STAMP,
        updatedAt: STAMP,
        workoutId: id,
        exerciseId,
        position,
        restSeconds: 90,
      })
      .run();
    db.insert(workoutSets)
      .values({
        id: `${entry}-set`,
        userId: owner,
        createdAt: STAMP,
        updatedAt: STAMP,
        workoutExerciseId: entry,
        position: 0,
        weightKg: 60,
        reps: 8,
        status: done.includes(exerciseId) ? 'done' : 'pending',
      })
      .run();
  }
}

describe('favourites', () => {
  it('starts with none, then keeps them in the order they were added', async () => {
    const { repo } = await setup();
    expect(await repo.favourites(USER)).toEqual([]);

    await repo.setFavourite(USER, 'squat-barbell', true);
    await repo.setFavourite(USER, 'bench-press-barbell', true);

    expect(await repo.favourites(USER)).toEqual(['squat-barbell', 'bench-press-barbell']);
  });

  it('removes one, and asking twice changes nothing', async () => {
    const { repo } = await setup();
    await repo.setFavourite(USER, 'squat-barbell', true);
    await repo.setFavourite(USER, 'squat-barbell', true);

    expect(await repo.favourites(USER)).toEqual(['squat-barbell']);

    await repo.setFavourite(USER, 'squat-barbell', false);
    await repo.setFavourite(USER, 'squat-barbell', false);

    expect(await repo.favourites(USER)).toEqual([]);
  });

  it("are each person's own, a guest's included", async () => {
    const { repo } = await setup();
    await repo.setFavourite(USER, 'squat-barbell', true);
    await repo.setFavourite('user-2', 'squat-barbell', true);
    await repo.setFavourite(null, 'plank', true);

    expect(await repo.favourites(USER)).toEqual(['squat-barbell']);
    expect(await repo.favourites(null)).toEqual(['plank']);

    await repo.setFavourite('user-2', 'squat-barbell', false);
    expect(await repo.favourites(USER)).toEqual(['squat-barbell']);
  });

  it("become the account's on signing in, without doubling one it already had", async () => {
    const { db, repo } = await setup();
    await repo.setFavourite(USER, 'squat-barbell', true);
    await repo.setFavourite(null, 'squat-barbell', true);
    await repo.setFavourite(null, 'plank', true);

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-01T10:00:00.000Z');

    expect(await repo.favourites(USER)).toEqual(['squat-barbell', 'plank']);
    expect(await repo.favourites(null)).toEqual([]);
    expect(db.select().from(exerciseFavourites).all()).toHaveLength(2);
  });
});

describe('recent exercises', () => {
  it('are those completed in finished workouts, the latest first', async () => {
    const { db, repo } = await setup();
    workoutWith(db, 'w1', USER, '2026-09-26T18:00:00.000Z', { done: ['squat-barbell', 'plank'] });
    workoutWith(db, 'w2', USER, '2026-09-28T18:00:00.000Z', { done: ['squat-barbell'] });
    workoutWith(db, 'w3', USER, '2026-09-30T18:00:00.000Z', { done: ['bench-press-barbell'] });

    expect(await repo.recent(USER, 5)).toEqual(['bench-press-barbell', 'squat-barbell', 'plank']);
  });

  it('leave out exercises never completed, a workout in progress and anyone else', async () => {
    const { db, repo } = await setup();
    workoutWith(db, 'w1', USER, '2026-09-28T18:00:00.000Z', { done: ['squat-barbell'], undone: ['plank'] });
    workoutWith(db, 'w2', USER, '2026-09-30T18:00:00.000Z', { done: ['deadlift-barbell'], finished: false });
    workoutWith(db, 'w3', 'user-2', '2026-09-30T18:00:00.000Z', { done: ['pull-up'] });

    expect(await repo.recent(USER, 5)).toEqual(['squat-barbell']);
  });

  it('stop at the limit', async () => {
    const { db, repo } = await setup();
    workoutWith(db, 'w1', USER, '2026-09-28T18:00:00.000Z', {
      done: ['squat-barbell', 'plank', 'pull-up', 'deadlift-barbell', 'bench-press-barbell', 'chin-up'],
    });

    expect(await repo.recent(USER, 5)).toHaveLength(5);
  });
});

describe('creating an exercise', () => {
  it("adds the person's own exercise to their library, measured by its equipment", async () => {
    const { repo } = await setup();

    const created = await repo.create(USER, {
      name: 'Landmine Press',
      equipment: 'barbell',
      primaryMuscle: 'shoulders',
    });
    const pushUp = await repo.create(USER, {
      name: 'Deficit Push Up',
      equipment: 'bodyweight',
      primaryMuscle: 'chest',
    });

    expect(created).toMatchObject({
      ok: true,
      exercise: {
        name: 'Landmine Press',
        userId: USER,
        isCustom: true,
        type: 'weighted',
        secondaryMuscles: [],
      },
    });
    expect(pushUp).toMatchObject({ ok: true, exercise: { type: 'bodyweight' } });
    expect((await repo.list(USER)).some((row) => row.name === 'Landmine Press')).toBe(true);
    expect((await repo.list('user-2')).some((row) => row.name === 'Landmine Press')).toBe(false);
  });

  it('refuses a name already in the library, and adds nothing', async () => {
    const { repo } = await setup();

    const result = await repo.create(USER, { name: 'plank', equipment: 'bodyweight', primaryMuscle: 'abs' });

    expect(result).toEqual({ ok: false, reason: 'Plank is already in your exercises' });
    expect(await repo.list(USER)).toHaveLength(LIBRARY_SIZE);
  });

  it("lets a guest create one, which becomes the account's on signing in", async () => {
    const { db, repo } = await setup();
    await repo.create(null, { name: 'Landmine Press', equipment: 'barbell', primaryMuscle: 'shoulders' });

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-01T10:00:00.000Z');

    expect((await repo.list(USER)).find((row) => row.name === 'Landmine Press')).toMatchObject({
      userId: USER,
    });
    expect(await repo.list(null)).toHaveLength(LIBRARY_SIZE);
  });
});
