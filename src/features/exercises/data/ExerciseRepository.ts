import type { ExerciseRow } from '@/core/db/schema';

import { searchExercises } from '../domain/search';
import type { ExerciseDao, ExerciseOwner } from './local/exerciseDao';

export type { ExerciseOwner } from './local/exerciseDao';

/**
 * The exercise library. Local only: the 104 built-in exercises are seeded by the migration and custom
 * ones are added by the person, so the whole library works offline and in guest mode. Favourites stay on
 * the phone too.
 */
export interface ExerciseRepository {
  /** Every exercise available to this owner, by name. */
  list(owner: ExerciseOwner): Promise<ExerciseRow[]>;
  /** The library narrowed by a typed query; a blank query is the whole list. */
  search(owner: ExerciseOwner, query: string): Promise<ExerciseRow[]>;
  get(id: string): Promise<ExerciseRow | null>;
  /** The ids of the owner's favourite exercises, the first added first. */
  favourites(owner: ExerciseOwner): Promise<string[]>;
  /** Makes an exercise a favourite, or not. Asking for what is already so changes nothing. */
  setFavourite(owner: ExerciseOwner, exerciseId: string, favourite: boolean): Promise<void>;
  /** The exercises most recently completed in a finished workout, the latest first. */
  recent(owner: ExerciseOwner, limit: number): Promise<string[]>;
}

export interface LocalExerciseDeps {
  dao: ExerciseDao;
  uuid: () => string;
  now: () => string;
}

export class LocalExerciseRepository implements ExerciseRepository {
  constructor(private readonly deps: LocalExerciseDeps) {}

  async list(owner: ExerciseOwner): Promise<ExerciseRow[]> {
    return this.deps.dao.list(owner);
  }

  async search(owner: ExerciseOwner, query: string): Promise<ExerciseRow[]> {
    // The library is ~100 rows, so it is filtered in memory: one query, and the matching rules stay in
    // one pure, tested function rather than being split between SQL and TypeScript.
    return searchExercises(await this.deps.dao.list(owner), query);
  }

  async get(id: string): Promise<ExerciseRow | null> {
    return this.deps.dao.get(id);
  }

  async favourites(owner: ExerciseOwner): Promise<string[]> {
    return this.deps.dao.favouriteIds(owner);
  }

  async setFavourite(owner: ExerciseOwner, exerciseId: string, favourite: boolean): Promise<void> {
    const { dao, uuid, now } = this.deps;
    if (!favourite) {
      await dao.deleteFavourite(owner, exerciseId);
      return;
    }
    // A guest's rows have no owner, which the unique index cannot tell apart, so this checks first.
    if ((await dao.favouriteIds(owner)).includes(exerciseId)) return;
    const timestamp = now();
    await dao.insertFavourite({
      id: uuid(),
      userId: owner,
      createdAt: timestamp,
      updatedAt: timestamp,
      exerciseId,
    });
  }

  async recent(owner: ExerciseOwner, limit: number): Promise<string[]> {
    return this.deps.dao.recentIds(owner, limit);
  }
}
