import { eq } from 'drizzle-orm';

import { routineExercises } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';
import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import type { WorkoutDayRepository } from '@/features/workoutDays/data/WorkoutDayRepository';
import { createWorkoutDao } from '@/features/workouts/data/local/workoutDao';
import { LocalWorkoutRepository, type WorkoutRepository } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';

import type { RoutineDraft, RoutineDraftItem } from '../../domain/draft';
import { createRoutineDao } from '../local/routineDao';
import { LocalRoutineRepository, type RoutineRepository } from '../RoutineRepository';

const USER = 'user-1';

async function setup(): Promise<{ db: AppDatabase; repo: RoutineRepository; workouts: WorkoutRepository }> {
  const db = await createTestDatabase();
  let ids = 0;
  let ticks = 0;
  const uuid = () => `id-${++ids}`;
  const now = () => new Date(Date.UTC(2026, 9, 1, 9, 0, ticks++)).toISOString();
  const repo = new LocalRoutineRepository({ dao: createRoutineDao(db), uuid, now });
  // Listing and starting routines stay with the workouts; days are not touched here.
  const workouts = new LocalWorkoutRepository({
    dao: createWorkoutDao(db),
    workoutDays: {} as WorkoutDayRepository,
    uuid,
    now,
  });
  return { db, repo, workouts };
}

const item = (key: string, exerciseId: string, over: Partial<RoutineDraftItem> = {}): RoutineDraftItem => ({
  key,
  exerciseId,
  targetSets: 3,
  targetReps: 10,
  targetSeconds: null,
  startWeightKg: null,
  ...over,
});

const ARMS: RoutineDraft = {
  routineId: null,
  name: 'Arms',
  items: [item('a', 'bicep-curl-dumbbell'), item('b', 'triceps-pushdown-cable', { targetSets: 4 })],
};

const exerciseIds = (draft: RoutineDraft | null) => draft?.items.map((one) => one.exerciseId);

describe('creating a routine', () => {
  it('saves its exercises in order, and lists it after the others', async () => {
    const { repo, workouts } = await setup();

    const saved = await repo.save(USER, ARMS);

    expect(saved).toEqual({ ok: true, id: expect.any(String) });
    const id = saved.ok ? saved.id : '';
    const listed = await workouts.routines(USER);
    expect(listed.map((one) => one.name)).toEqual(['Push Day', 'Pull Day', 'Leg Day', 'Arms']);
    expect(listed.at(-1)?.exerciseCount).toBe(2);
    const detail = await repo.get(USER, id);
    expect(detail).toMatchObject({ routineId: id, name: 'Arms' });
    expect(exerciseIds(detail)).toEqual(['bicep-curl-dumbbell', 'triceps-pushdown-cable']);
    expect(detail?.items[1]).toMatchObject({ targetSets: 4, targetReps: 10 });
  });

  it("is that person's own", async () => {
    const { repo, workouts } = await setup();
    const saved = await repo.save(USER, ARMS);

    expect((await workouts.routines('user-2')).map((one) => one.name)).not.toContain('Arms');
    expect(await repo.get('user-2', saved.ok ? saved.id : '')).toBeNull();
  });

  it('needs a name, and saves nothing without one', async () => {
    const { repo, workouts } = await setup();

    expect(await repo.save(USER, { ...ARMS, name: '  ' })).toEqual({
      ok: false,
      reason: 'Give the routine a name',
    });
    expect(await workouts.routines(USER)).toHaveLength(3);
  });
});

describe('editing a routine', () => {
  it('renames it, and keeps its exercises in their new order', async () => {
    const { repo, workouts } = await setup();
    const push = await repo.get(USER, 'push');
    if (!push) throw new Error('No Push Day');
    const [first, second] = push.items;
    if (!first || !second) throw new Error('Push Day has too few exercises');

    await repo.save(USER, { ...push, name: ' Push ', items: [second, first] });

    expect(exerciseIds(await repo.get(USER, 'push'))).toEqual([second.exerciseId, first.exerciseId]);
    expect((await workouts.routines(USER))[0]).toMatchObject({ name: 'Push', exerciseCount: 2 });
  });

  it('starts the next workout from the routine as it was saved', async () => {
    const { repo, workouts } = await setup();
    const push = await repo.get(USER, 'push');
    if (!push) throw new Error('No Push Day');
    await repo.save(USER, { ...push, items: push.items.slice(0, 1) });

    const workout = await workouts.start(USER, {
      date: '2026-10-02' as ISODate,
      bodyweightKg: 70,
      restSeconds: 90,
      routineId: 'push',
    });

    expect(workout.exercises.map((one) => one.exerciseId)).toEqual([push.items[0]?.exerciseId]);
  });
});

describe('deleting a routine', () => {
  it('takes it off the list', async () => {
    const { repo, workouts } = await setup();

    await repo.remove(USER, 'pull');

    expect((await workouts.routines(USER)).map((one) => one.name)).toEqual(['Push Day', 'Leg Day']);
    expect(await repo.get(USER, 'pull')).toBeNull();
  });
});

describe("a guest's routines", () => {
  it("become the account's on signing in, while the starters stay everyone's", async () => {
    const { db, repo, workouts } = await setup();
    const saved = await repo.save(null, ARMS);
    const id = saved.ok ? saved.id : '';

    await createGuestDataDao(db).reassignGuestData('guest-1', USER, '2026-10-01T10:00:00.000Z');

    expect((await workouts.routines(USER)).map((one) => one.name)).toContain('Arms');
    expect((await workouts.routines(null)).map((one) => one.name)).toEqual([
      'Push Day',
      'Pull Day',
      'Leg Day',
    ]);
    const owners = (routineId: string) =>
      db
        .select({ userId: routineExercises.userId })
        .from(routineExercises)
        .where(eq(routineExercises.routineId, routineId))
        .all()
        .map((row) => row.userId);
    expect(owners(id)).toEqual([USER, USER]);
    expect(new Set(owners('push'))).toEqual(new Set([null]));
  });
});
