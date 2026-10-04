import type { ISODate } from '@/shared/lib/date/isoDate';

import type { BodyweightDao } from './local/bodyweightDao';

/** A signed-in user's id, or null for a guest. */
export type BodyweightOwner = string | null;

/**
 * Weigh-ins, kept on this phone like the workouts (nothing about the body goes to Streak). The current
 * bodyweight itself is a training preference: logging one sets it too, from the screen that logs it.
 */
export interface BodyweightRepository {
  /** Records the day's weigh-in. One a day: a second one that day replaces the first. */
  log(owner: BodyweightOwner, date: ISODate, weightKg: number): Promise<void>;
}

export interface LocalBodyweightDeps {
  dao: BodyweightDao;
  uuid: () => string;
  now: () => string;
}

export class LocalBodyweightRepository implements BodyweightRepository {
  constructor(private readonly deps: LocalBodyweightDeps) {}

  async log(owner: BodyweightOwner, date: ISODate, weightKg: number): Promise<void> {
    const { dao, uuid, now } = this.deps;
    const at = now();
    const same = await dao.onDate(owner, date);
    if (same) {
      await dao.setWeight(same.id, weightKg, at);
      return;
    }
    await dao.insert({ id: uuid(), userId: owner, createdAt: at, updatedAt: at, date, weightKg });
  }
}
