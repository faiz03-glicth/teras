import type { MuscleSetRow } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { BODY_SIDES } from '@/features/exercises/ui/components/bodyMapPaths';

import { GROUP_OF_REGION } from '../bodyRegions';
import {
  EMPTY_HISTORY,
  muscleBalance,
  muscleHistory,
  muscleWindow,
  tiersOf,
  weekSummary,
} from '../muscleCards';
import { emptyGroups, MUSCLE_GROUPS } from '../muscleGroups';
import { radarPoints, radarScale, RADAR_LABELS, RADAR_RINGS } from '../radar';

// Thursday 22 Oct 2026: this week began Monday 19 Oct, last week Monday 12 Oct.
const TODAY = '2026-10-22' as ISODate;
const THIS_MONDAY = '2026-10-19' as ISODate;

let workoutCount = 0;
const row = (
  date: string,
  primary: MuscleSetRow['primaryMuscle'],
  secondary: MuscleSetRow['secondaryMuscles'] = [],
  doneSets = 3,
  workoutId = `w${(workoutCount += 1)}`,
): MuscleSetRow => ({ workoutId, date, primaryMuscle: primary, secondaryMuscles: secondary, doneSets });

/** A workout on `date` that works the given primary muscles, one exercise each. */
const workout = (id: string, date: string, ...muscles: MuscleSetRow['primaryMuscle'][]): MuscleSetRow[] =>
  muscles.map((muscle) => row(date, muscle, [], 3, id));

/** A primary muscle for each of the ten groups, in the groups' order. */
const MUSCLE_OF_GROUP = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'calves',
  'hamstrings',
  'glutes',
  'lats',
] as const satisfies readonly MuscleSetRow['primaryMuscle'][];

/** Every one of the ten groups, once, in one workout. */
const wholeBody = (id: string, date: string) => workout(id, date, ...MUSCLE_OF_GROUP);

describe('the window the cards read', () => {
  it('runs from 56 days back to today, which holds the 4 weeks and the 4 before, and last week', () => {
    expect(muscleWindow(TODAY)).toEqual({ from: '2026-08-28', to: TODAY });
  });
});

describe('the body map tiers', () => {
  it('maps hits to not hit, once and twice', () => {
    const hits = { ...emptyGroups(), chest: 2, back: 1, core: 0.5, calves: 3 };
    const tiers = tiersOf(hits);

    expect(tiers.chest).toBe(2);
    expect(tiers.back).toBe(1);
    expect(tiers.core).toBe(1);
    expect(tiers.calves).toBe(2);
    expect(tiers.quads).toBe(0);
  });

  it("shades only this week's rows, from Monday", () => {
    const rows = [
      ...workout('mon', '2026-10-19', 'chest'),
      ...workout('wed', '2026-10-21', 'chest', 'quads'),
      ...workout('before', '2026-10-18', 'quads', 'calves'),
    ];
    const week = weekSummary(rows, THIS_MONDAY);

    expect(week.tiers.chest).toBe(2);
    expect(week.tiers.quads).toBe(1);
    expect(week.tiers.calves).toBe(0);
    expect(week.twice).toBe(1);
    expect(week.allTwice).toBe(false);
  });

  it('counts a muscle once per workout, however many exercises train it', () => {
    const rows = [row('2026-10-20', 'chest', [], 3, 'w1'), row('2026-10-20', 'chest', [], 3, 'w1')];

    expect(weekSummary(rows, THIS_MONDAY).tiers.chest).toBe(1);
  });

  it('reads out the count and each muscle that is short of the goal', () => {
    const rows = [...wholeBody('a', '2026-10-19'), ...workout('b', '2026-10-21', 'chest')];
    const { accessibilityLabel } = weekSummary(rows, THIS_MONDAY);

    expect(accessibilityLabel).toContain('1 of 10 muscles hit twice');
    expect(accessibilityLabel).toContain('Shoulders hit once');
    expect(accessibilityLabel).not.toContain('Chest hit');
  });

  it('shows the banner only when all ten are twice', () => {
    const nine = [...wholeBody('a', '2026-10-19'), ...wholeBody('b', '2026-10-20').slice(1)];
    const ten = [...wholeBody('a', '2026-10-19'), ...wholeBody('b', '2026-10-20')];

    expect(weekSummary(nine, THIS_MONDAY).allTwice).toBe(false);
    expect(weekSummary(nine, THIS_MONDAY).twice).toBe(9);
    expect(weekSummary(ten, THIS_MONDAY).allTwice).toBe(true);
    expect(weekSummary(ten, THIS_MONDAY).accessibilityLabel).toBe(
      'Muscles this week, front and back: 10 of 10 muscles hit twice.',
    );
  });

  it('has a region of the drawing for no muscle that the groups do not know', () => {
    const regions = [...Object.keys(BODY_SIDES.front.regions), ...Object.keys(BODY_SIDES.back.regions)];

    expect(regions.filter((region) => !(region in GROUP_OF_REGION))).toEqual([]);
    expect(Object.keys(GROUP_OF_REGION).filter((region) => !regions.includes(region))).toEqual([]);
  });
});

describe('the muscle history', () => {
  it('shows two weeks: last week, then this week, a row per muscle in the mockup order', () => {
    const rows = [
      ...workout('l1', '2026-10-13', 'chest'),
      ...workout('l2', '2026-10-15', 'chest'),
      ...workout('t1', '2026-10-20', 'chest', 'quads'),
    ];
    const history = muscleHistory(rows, TODAY);

    expect(history.rows.map((r) => r.group)).toEqual([...MUSCLE_GROUPS]);
    expect(history.rows.find((r) => r.group === 'chest')?.tiers).toEqual([2, 1]);
    expect(history.rows.find((r) => r.group === 'quads')?.tiers).toEqual([0, 1]);
    expect(history.rows.find((r) => r.group === 'calves')?.tiers).toEqual([0, 0]);
  });

  it('ignores anything older than last week', () => {
    const rows = workout('old', '2026-10-11', 'chest');

    expect(muscleHistory(rows, TODAY).rows.find((r) => r.group === 'chest')?.tiers).toEqual([0, 0]);
  });

  it('flags a muscle that is behind this week, however last week went', () => {
    const rows = [
      ...wholeBody('l1', '2026-10-13'),
      ...wholeBody('l2', '2026-10-14'),
      ...workout('t1', '2026-10-19', 'chest', 'shoulders'),
      ...workout('t2', '2026-10-20', 'chest'),
    ];
    const history = muscleHistory(rows, TODAY);
    const flagged = history.rows.filter((r) => r.behind).map((r) => r.group);

    expect(history.rows.find((r) => r.group === 'chest')?.behind).toBe(false);
    expect(flagged).toContain('shoulders');
    expect(flagged).toContain('calves');
    expect(flagged).not.toContain('chest');
    expect(history.behind).toEqual(flagged);
  });

  it('counts the weeks that had every muscle twice, out of two', () => {
    const lastWeek = [...wholeBody('l1', '2026-10-13'), ...wholeBody('l2', '2026-10-14')];
    const thisWeek = [...wholeBody('t1', '2026-10-19'), ...wholeBody('t2', '2026-10-20')];

    expect(muscleHistory(lastWeek, TODAY)).toMatchObject({ weeksTwice: 1, goal: [true, false] });
    expect(muscleHistory([...lastWeek, ...thisWeek], TODAY)).toMatchObject({
      weeksTwice: 2,
      goal: [true, true],
    });
    expect(muscleHistory([], TODAY)).toMatchObject({ weeksTwice: 0, goal: [false, false] });
  });

  it('says for a screen reader how many weeks were complete and who is behind', () => {
    const { accessibilityLabel } = muscleHistory(wholeBody('t1', '2026-10-20'), TODAY);

    expect(accessibilityLabel).toBe(
      'Muscle history, last 2 weeks. Every muscle twice in 0 of 2 weeks. Behind this week: Chest, Shoulders, Biceps, Triceps, Core, Quads, Calves, Hamstrings, Glutes, Back.',
    );
  });

  it('flags nothing while there is nothing read', () => {
    expect(EMPTY_HISTORY.rows.some((r) => r.behind)).toBe(false);
    expect(EMPTY_HISTORY.rows.every((r) => r.tiers[0] === 0 && r.tiers[1] === 0)).toBe(true);
  });
});

describe('the muscle balance', () => {
  // The last 4 weeks: 25 Sep to 22 Oct. The 4 before: 28 Aug to 24 Sep.
  it('compares the last 4 weeks with the 4 before', () => {
    const rows = [
      row('2026-10-20', 'chest', [], 10),
      row('2026-09-25', 'chest', [], 4),
      row('2026-09-24', 'chest', [], 6),
      row('2026-08-28', 'chest', [], 2),
      row('2026-10-21', 'quads', ['glutes'], 4),
      row('2026-08-20', 'quads', [], 50),
    ];
    const balance = muscleBalance(rows, TODAY);

    expect(balance.empty).toBe(false);
    // Chest: 14 now against 8 before (+6). Quads: 4 now, none before (+4). The 20 Aug sets are in neither period.
    expect(balance.tiles[0]).toMatchObject({
      label: 'Biggest gain',
      name: 'Chest',
      sub: '+6 sets',
      tone: 'accent',
    });
    expect(balance.now.split(' ')).toHaveLength(MUSCLE_GROUPS.length);
    expect(balance.before.split(' ')).toHaveLength(MUSCLE_GROUPS.length);
    expect(balance.now).not.toBe(balance.before);
  });

  it('names the least trained muscle as the one that needs work', () => {
    // Chest 2 sets, Shoulders 3, ... Back 11.
    const rows = MUSCLE_OF_GROUP.map((muscle, index) => row('2026-10-20', muscle, [], index + 2));
    const balance = muscleBalance(rows, TODAY);

    expect(balance.tiles[1]).toMatchObject({ label: 'Needs work', name: 'Chest', sub: '2 sets' });
    expect(balance.accessibilityLabel).toContain('Most trained: Back');
    expect(balance.accessibilityLabel).toContain('Least trained: Chest');
  });

  it('counts a secondary muscle half, and shows halves', () => {
    const balance = muscleBalance([row('2026-10-20', 'chest', ['triceps'], 3)], TODAY);

    expect(balance.tiles[0]).toMatchObject({ name: 'Chest', sub: '+3 sets' });
    const triceps = muscleBalance([row('2026-10-20', 'triceps', [], 1)], TODAY);
    expect(triceps.tiles[0]?.sub).toBe('+1 set');
    const half = muscleBalance([row('2026-10-20', 'chest', ['triceps'], 1)], TODAY);
    // Triceps got half a set; the first of the muscles with none is Shoulders.
    expect(half.tiles[1]).toMatchObject({ name: 'Shoulders', sub: '0 sets' });
  });

  it('says no muscle grew when the last 4 weeks fell behind the 4 before', () => {
    const balance = muscleBalance([row('2026-09-01', 'chest', [], 9)], TODAY);

    expect(balance.tiles[0]).toMatchObject({ label: 'Biggest gain', name: 'None yet', tone: 'secondary' });
  });

  it('is empty when no set was completed in either period', () => {
    const balance = muscleBalance([row('2026-10-20', 'chest', [], 0)], TODAY);

    expect(balance).toMatchObject({ empty: true, now: '', before: '', tiles: [] });
    expect(muscleBalance([], TODAY).empty).toBe(true);
  });
});

describe('the radar', () => {
  it('has ten labels in the muscle order, a web of three rings, and one polygon of points per shape', () => {
    expect(RADAR_LABELS.map((l) => l.group)).toEqual([...MUSCLE_GROUPS]);
    expect(RADAR_LABELS.map((l) => l.label)[0]).toBe('Chest');
    expect(RADAR_RINGS).toHaveLength(3);
    RADAR_RINGS.forEach((ring) => expect(ring.split(' ')).toHaveLength(10));
  });

  it('puts a zero at the middle and the scale on the outer ring', () => {
    const zero = radarPoints(emptyGroups(), 12).split(' ');
    const full = radarPoints({ ...emptyGroups(), chest: 12 }, 12).split(' ');

    expect(zero.every((point) => point === '163.0,150.0')).toBe(true);
    // The first axis points straight up, 100 from the middle.
    expect(full[0]).toBe('163.0,50.0');
    // Never past the outer ring.
    expect(radarPoints({ ...emptyGroups(), chest: 99 }, 12).split(' ')[0]).toBe('163.0,50.0');
  });

  it('grows its scale in steps of six sets from twelve', () => {
    expect(radarScale(emptyGroups())).toBe(12);
    expect(radarScale({ ...emptyGroups(), chest: 12 })).toBe(12);
    expect(radarScale({ ...emptyGroups(), chest: 12.5 }, emptyGroups())).toBe(18);
    expect(radarScale(emptyGroups(), { ...emptyGroups(), back: 37 })).toBe(42);
  });
});
