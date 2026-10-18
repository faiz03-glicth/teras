import type { HeatLevel } from '@/features/heatmap/domain/grid';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { HEAT_WINDOW_DAYS } from '../domain/heatLevel';
import type { DayTotals, WorkoutDay } from '../domain/WorkoutDay';
import type { WorkoutDayDao, WorkoutDayOwner } from './local/workoutDayDao';
import type { WorkoutDayApi } from './remote/workoutDayApi';

export type { WorkoutDayOwner } from './local/workoutDayDao';

/**
 * The daily summaries Streak draws its training wave from. SQLite is the source of truth; Supabase gets
 * a copy. Workout logging calls `recordDay` whenever a day's completed sets change.
 */
export interface WorkoutDayRepository {
  /**
   * Stores the day's totals with its level and marks it to be sent. The level is worked out by whoever
   * logged the training (progressive overload against the same lifts last week, in workouts) and frozen here.
   */
  recordDay(owner: WorkoutDayOwner, date: ISODate, totals: DayTotals, level: HeatLevel): Promise<WorkoutDay>;
  /** Days in the range (inclusive), oldest first. */
  list(owner: WorkoutDayOwner, from: ISODate, to: ISODate): Promise<WorkoutDay[]>;
  /** The years with at least one recorded day, newest first: the year Calendar's list. */
  years(owner: WorkoutDayOwner): Promise<number[]>;
  /**
   * The volumes of the training days in the 90 days before `date`, for the Day detail's comparison.
   */
  windowBefore(owner: WorkoutDayOwner, date: ISODate): Promise<number[]>;
  /** Sends the signed-in user's days that aren't on the server yet. Returns how many were sent. */
  pushPending(userId: string): Promise<number>;
}

export interface LocalFirstWorkoutDayDeps {
  dao: WorkoutDayDao;
  api: WorkoutDayApi;
  uuid: () => string;
  now: () => string;
}

/** Days per request when pushing: small enough for the server's per-row Streak trigger to finish in time. */
export const PUSH_PAGE = 200;

const toDay = (row: {
  date: string;
  volumeKg: number;
  sets: number;
  workouts: number;
  level: number;
}): WorkoutDay => ({
  date: row.date as ISODate,
  volumeKg: row.volumeKg,
  sets: row.sets,
  workouts: row.workouts,
  level: row.level as HeatLevel,
});

export class LocalFirstWorkoutDayRepository implements WorkoutDayRepository {
  /** Pushes in flight, per user, so a reconnect and a foreground at once send one request. */
  private readonly pushing = new Map<string, Promise<number>>();

  constructor(private readonly deps: LocalFirstWorkoutDayDeps) {}

  async recordDay(
    owner: WorkoutDayOwner,
    date: ISODate,
    totals: DayTotals,
    level: HeatLevel,
  ): Promise<WorkoutDay> {
    const { dao, uuid, now } = this.deps;
    const existing = await dao.getByDate(owner, date);
    const timestamp = now();
    const row = {
      id: existing?.id ?? uuid(),
      userId: owner,
      date,
      volumeKg: totals.volumeKg,
      sets: totals.sets,
      workouts: totals.workouts,
      level,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      dirty: true,
    };
    await dao.save(row);
    return toDay(row);
  }

  async list(owner: WorkoutDayOwner, from: ISODate, to: ISODate): Promise<WorkoutDay[]> {
    return (await this.deps.dao.list(owner, from, to)).map(toDay);
  }

  years(owner: WorkoutDayOwner): Promise<number[]> {
    return this.deps.dao.years(owner);
  }

  windowBefore(owner: WorkoutDayOwner, date: ISODate): Promise<number[]> {
    return this.deps.dao.trainingVolumes(owner, addDays(date, -HEAT_WINDOW_DAYS), addDays(date, -1));
  }

  pushPending(userId: string): Promise<number> {
    const inFlight = this.pushing.get(userId);
    if (inFlight) return inFlight;
    const push = this.push(userId).finally(() => this.pushing.delete(userId));
    this.pushing.set(userId, push);
    return push;
  }

  /**
   * Sends the dirty days a page at a time: each row starts Streak's check-in trigger on the server, so a
   * large backlog (an import of years) in one request could outlast the statement timeout. Each page is
   * marked clean as it lands, so a failure part-way leaves only the unsent pages to retry.
   */
  private async push(userId: string): Promise<number> {
    const { dao, api } = this.deps;
    const rows = await dao.listDirty(userId);
    for (let start = 0; start < rows.length; start += PUSH_PAGE) {
      const page = rows.slice(start, start + PUSH_PAGE);
      await api.upsert(
        userId,
        page.map((row) => ({
          date: row.date,
          volume_kg: row.volumeKg,
          sets: row.sets,
          workouts: row.workouts,
          level: row.level,
        })),
      );
      for (const row of page) await dao.markClean(row.id, row.updatedAt);
    }
    return rows.length;
  }
}
