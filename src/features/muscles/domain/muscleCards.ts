import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS, type MuscleGroup } from './muscleGroups';
import { radarPoints, radarScale } from './radar';
import {
  everyGroupTwice,
  hitsByGroup,
  hitTier,
  rowsOfWeek,
  setsByGroup,
  weekOf,
  type HitTier,
} from './muscleStats';

const WEEK_DAYS = 7;
/** The balance compares this many weeks with the same number before them. */
export const BALANCE_WEEKS = 4;
/** The history shows this week and the one before. */
export const HISTORY_WEEKS = 2;
const PERIOD_DAYS = BALANCE_WEEKS * WEEK_DAYS;

/**
 * PURE: the dates the three muscle cards are drawn from, in one read: the 4 weeks before the 4 weeks to
 * today, which also holds this week and last (a week back from Monday is at most 13 days before today).
 */
export function muscleWindow(today: ISODate): { from: ISODate; to: ISODate } {
  return { from: addDays(today, -(2 * PERIOD_DAYS - 1)), to: today };
}

/** Each group's look: 0 not hit, 1 hit once, 2 hit twice or more. */
export type GroupTiers = Record<MuscleGroup, HitTier>;

/** PURE: hits per group as tiers. */
export function tiersOf(hits: Record<MuscleGroup, number>): GroupTiers {
  const tiers = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, hitTier(hits[group])]));
  return tiers as GroupTiers;
}

const groupNames = (groups: readonly MuscleGroup[]): string =>
  groups.map((group) => MUSCLE_GROUP_LABELS[group]).join(', ');

export interface WeekSummary {
  tiers: GroupTiers;
  /** How many of the ten groups were hit twice or more. */
  twice: number;
  /** Every group reached the goal: the "Keep this up" banner. */
  allTwice: boolean;
  /** For a screen reader: the count, and each group still short of the goal. */
  accessibilityLabel: string;
}

/** PURE: the week starting `monday` as the Home card shows it. */
export function weekSummary(rows: readonly MuscleSetRow[], monday: ISODate): WeekSummary {
  const hits = hitsByGroup(rowsOfWeek(rows, monday));
  const tiers = tiersOf(hits);
  const twice = MUSCLE_GROUPS.filter((group) => tiers[group] === 2).length;
  const allTwice = everyGroupTwice(hits);
  const lacking = MUSCLE_GROUPS.filter((group) => tiers[group] < 2).map(
    (group) => `${MUSCLE_GROUP_LABELS[group]} ${tiers[group] === 0 ? 'not hit yet' : 'hit once'}`,
  );
  const head = `Muscles this week, front and back: ${twice} of ${MUSCLE_GROUPS.length} muscles hit twice.`;
  return {
    tiers,
    twice,
    allTwice,
    accessibilityLabel: lacking.length > 0 ? `${head} ${lacking.join(', ')}.` : head,
  };
}

/** The week summary of a week with nothing in it: what the card shows while loading. */
export const EMPTY_WEEK: WeekSummary = weekSummary([], '1970-01-05' as ISODate);

export interface HistoryRow {
  group: MuscleGroup;
  label: string;
  /** Last week, then this week. */
  tiers: readonly [HitTier, HitTier];
  /** Still short of the goal this week: marked with a bullet, as colour is not the only cue. */
  behind: boolean;
}

export interface MuscleHistory {
  rows: readonly HistoryRow[];
  /** Of the two weeks, how many had every muscle twice. */
  weeksTwice: number;
  /** One dot per week: filled when that week had every muscle twice. */
  goal: readonly [boolean, boolean];
  /** Those short of the goal this week, by name. */
  behind: readonly MuscleGroup[];
  accessibilityLabel: string;
}

/** PURE: the last two weeks, a muscle per row, for the Profile's Muscle history. */
export function muscleHistory(rows: readonly MuscleSetRow[], today: ISODate): MuscleHistory {
  const thisMonday = weekOf(today);
  const lastMonday = addDays(thisMonday, -WEEK_DAYS);
  const last = hitsByGroup(rowsOfWeek(rows, lastMonday));
  const current = hitsByGroup(rowsOfWeek(rows, thisMonday));
  const historyRows = MUSCLE_GROUPS.map((group): HistoryRow => {
    const tiers: readonly [HitTier, HitTier] = [hitTier(last[group]), hitTier(current[group])];
    return { group, label: MUSCLE_GROUP_LABELS[group], tiers, behind: tiers[1] < 2 };
  });
  const goal = [everyGroupTwice(last), everyGroupTwice(current)] as const;
  const weeksTwice = goal.filter(Boolean).length;
  const behind = historyRows.filter((row) => row.behind).map((row) => row.group);
  const behindText = behind.length > 0 ? groupNames(behind) : 'none';
  return {
    rows: historyRows,
    weeksTwice,
    goal,
    behind,
    accessibilityLabel: `Muscle history, last ${HISTORY_WEEKS} weeks. Every muscle twice in ${weeksTwice} of ${HISTORY_WEEKS} weeks. Behind this week: ${behindText}.`,
  };
}

const idleHistory = (): MuscleHistory => {
  const none = muscleHistory([], '1970-01-05' as ISODate);
  // Nothing has been read, so nothing is behind: no bullets while the card loads.
  return { ...none, rows: none.rows.map((row) => ({ ...row, behind: false })), behind: [] };
};

/** The history before any rows are read: nothing hit and nothing flagged. What the card shows while loading. */
export const EMPTY_HISTORY: MuscleHistory = idleHistory();

export interface BalanceTile {
  label: string;
  name: string;
  sub: string;
  /** The line under the name is accent for a gain, plain otherwise. */
  tone: 'accent' | 'secondary';
}

export interface MuscleBalance {
  /** Nothing completed in either period: there is no web to draw. */
  empty: boolean;
  /** Polygon `points` of the last 4 weeks and the 4 before. */
  now: string;
  before: string;
  tiles: readonly BalanceTile[];
  accessibilityLabel: string;
}

const inRange = (rows: readonly MuscleSetRow[], from: ISODate, to: ISODate): MuscleSetRow[] =>
  rows.filter((row) => row.date >= from && row.date <= to);

/** Half sets exist (a secondary mover counts half): show one decimal only when there is one. */
const sets = (value: number): string => {
  const rounded = Number(value.toFixed(1));
  return `${rounded} ${rounded === 1 ? 'set' : 'sets'}`;
};

const NOTHING_YET: MuscleBalance = {
  empty: true,
  now: '',
  before: '',
  tiles: [],
  accessibilityLabel: 'Muscle balance, sets per muscle. No sets logged in the last 8 weeks.',
};

/** PURE: the sets per muscle over the last 4 weeks against the 4 before, as the web and its two tiles. */
export function muscleBalance(rows: readonly MuscleSetRow[], today: ISODate): MuscleBalance {
  const nowFrom = addDays(today, -(PERIOD_DAYS - 1));
  const now = setsByGroup(inRange(rows, nowFrom, today));
  const before = setsByGroup(inRange(rows, addDays(today, -(2 * PERIOD_DAYS - 1)), addDays(nowFrom, -1)));
  if (MUSCLE_GROUPS.every((group) => now[group] === 0 && before[group] === 0)) return NOTHING_YET;

  const scale = radarScale(now, before);
  const gain = MUSCLE_GROUPS.reduce((best, group) =>
    now[group] - before[group] > now[best] - before[best] ? group : best,
  );
  const least = MUSCLE_GROUPS.reduce((low, group) => (now[group] < now[low] ? group : low));
  const most = MUSCLE_GROUPS.reduce((high, group) => (now[group] > now[high] ? group : high));
  const delta = now[gain] - before[gain];
  const gainTile: BalanceTile =
    delta > 0
      ? { label: 'Biggest gain', name: MUSCLE_GROUP_LABELS[gain], sub: `+${sets(delta)}`, tone: 'accent' }
      : { label: 'Biggest gain', name: 'None yet', sub: 'No muscle grew', tone: 'secondary' };
  return {
    empty: false,
    now: radarPoints(now, scale),
    before: radarPoints(before, scale),
    tiles: [
      gainTile,
      { label: 'Needs work', name: MUSCLE_GROUP_LABELS[least], sub: sets(now[least]), tone: 'secondary' },
    ],
    accessibilityLabel: `Muscle balance, sets per muscle in the last ${BALANCE_WEEKS} weeks against the ${BALANCE_WEEKS} before. Most trained: ${MUSCLE_GROUP_LABELS[most]}. Least trained: ${MUSCLE_GROUP_LABELS[least]}.`,
  };
}
