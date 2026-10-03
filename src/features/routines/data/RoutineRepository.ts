import type { RoutineRow } from '@/core/db/schema';

import { checkRoutineName, type RoutineDraft } from '../domain/draft';
import type { RoutineDao } from './local/routineDao';

/** A signed-in user's id, or null for a guest. Starter routines belong to nobody. */
export type RoutineOwner = string | null;

/** A saved routine as the editor opens it: the draft it starts from. */
export type SavedRoutine = RoutineDraft & { routineId: string };

export type SaveResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * Building routines: open one to edit, save it, delete it. Local only, like the workouts made from them.
 * Listing and starting routines stay with the workouts (`WorkoutRepository`). The starters can be edited
 * and deleted like any other routine; they belong to whoever uses the phone.
 */
export interface RoutineRepository {
  /** A routine this owner can see, or null for one that is gone or someone else's. */
  get(owner: RoutineOwner, id: string): Promise<SavedRoutine | null>;
  /** Creates the routine (no `routineId`) or replaces a saved one with the draft. Refused without a name. */
  save(owner: RoutineOwner, draft: RoutineDraft): Promise<SaveResult>;
  remove(owner: RoutineOwner, id: string): Promise<void>;
}

export interface LocalRoutineDeps {
  dao: RoutineDao;
  uuid: () => string;
  now: () => string;
}

const visibleTo = (row: RoutineRow | null, owner: RoutineOwner): row is RoutineRow =>
  row !== null && row.deletedAt === null && (row.userId === null || row.userId === owner);

export class LocalRoutineRepository implements RoutineRepository {
  constructor(private readonly deps: LocalRoutineDeps) {}

  async get(owner: RoutineOwner, id: string): Promise<SavedRoutine | null> {
    const { dao } = this.deps;
    const row = await dao.get(id);
    if (!visibleTo(row, owner)) return null;
    const items = await dao.items(id);
    return {
      routineId: row.id,
      name: row.name,
      items: items.map((one) => ({
        key: one.id,
        exerciseId: one.exerciseId,
        targetSets: one.targetSets,
        targetReps: one.targetReps,
        targetSeconds: one.targetSeconds,
        startWeightKg: one.startWeightKg,
      })),
    };
  }

  async save(owner: RoutineOwner, draft: RoutineDraft): Promise<SaveResult> {
    const { dao, uuid, now } = this.deps;
    const name = checkRoutineName(draft.name);
    if (!name.ok) return name;
    const timestamp = now();

    if (draft.routineId === null) {
      const id = uuid();
      await dao.insert(
        {
          id,
          userId: owner,
          createdAt: timestamp,
          updatedAt: timestamp,
          name: name.name,
          position: await dao.nextPosition(),
        },
        this.rows(draft, id, owner, timestamp),
      );
      return { ok: true, id };
    }

    const row = await dao.get(draft.routineId);
    if (!visibleTo(row, owner)) throw new Error(`No routine ${draft.routineId}`);
    // The exercises belong to whoever the routine does: a starter's stay everyone's.
    await dao.update(row.id, name.name, this.rows(draft, row.id, row.userId, timestamp), timestamp);
    return { ok: true, id: row.id };
  }

  async remove(owner: RoutineOwner, id: string): Promise<void> {
    const { dao, now } = this.deps;
    const row = await dao.get(id);
    if (!visibleTo(row, owner)) return;
    // Soft: workouts started from it still name it.
    await dao.softDelete(id, now());
  }

  private rows(draft: RoutineDraft, routineId: string, userId: RoutineOwner, timestamp: string) {
    return draft.items.map((one, position) => ({
      id: this.deps.uuid(),
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      routineId,
      exerciseId: one.exerciseId,
      position,
      targetSets: one.targetSets,
      targetReps: one.targetReps,
      targetSeconds: one.targetSeconds,
      startWeightKg: one.startWeightKg,
    }));
  }
}
