import type { ISODate } from '@/shared/lib/date/isoDate';

import {
  beatTarget,
  bestSet,
  liftStanding,
  nextMatch,
  overloadLevel,
  trend,
  type LiftSession,
  type LiftStanding,
  type OverloadSet,
} from '../overload';

const done = (
  weightKg: number | null,
  reps: number | null,
  over: Partial<OverloadSet> = {},
): OverloadSet => ({
  status: 'done',
  setType: 'normal',
  weightKg,
  reps,
  seconds: null,
  ...over,
});

/** One session of the shoulder press: `date` is a day of October 2026 (the 5th, 12th and 19th are Mondays). */
const press = (date: number, sets: OverloadSet[], hour = 9): LiftSession => {
  const day = `2026-10-${String(date).padStart(2, '0')}` as ISODate;
  return {
    exerciseId: 'shoulder-press',
    type: 'weighted',
    workoutId: `w-${date}-${hour}`,
    date: day,
    startedAt: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    sets,
  };
};

describe('a lift’s best set in a session', () => {
  it('is the heaviest weight lifted for five reps or more', () => {
    expect(bestSet('weighted', [done(80, 8), done(85, 5), done(90, 3)])).toEqual({
      weightKg: 85,
      reps: 5,
      seconds: 0,
    });
  });

  it('breaks a tie on weight with more reps', () => {
    expect(bestSet('weighted', [done(80, 6), done(80, 9)])?.reps).toBe(9);
  });

  it('falls back to the heaviest set when none reached five reps', () => {
    expect(bestSet('weighted', [done(100, 2), done(110, 1)])?.weightKg).toBe(110);
  });

  it('leaves out warm-ups and unticked sets', () => {
    expect(
      bestSet('weighted', [
        done(120, 5, { setType: 'warmup' }),
        done(130, 5, { status: 'pending' }),
        done(60, 8),
      ]),
    ).toMatchObject({ weightKg: 60, reps: 8 });
  });

  it('is nothing when nothing counted', () => {
    expect(bestSet('weighted', [done(80, 8, { status: 'pending' })])).toBeNull();
    expect(bestSet('weighted', [done(80, 0)])).toBeNull();
  });

  it('counts a bodyweight lift’s added weight, none as 0', () => {
    expect(bestSet('bodyweight', [done(null, 12), done(10, 6)])).toMatchObject({ weightKg: 10, reps: 6 });
  });

  it('is the longest hold for a timed lift', () => {
    expect(bestSet('timed', [done(null, null, { seconds: 45 }), done(null, null, { seconds: 60 })])).toEqual({
      weightKg: 0,
      reps: 0,
      seconds: 60,
    });
  });
});

describe('against the session it is matched with', () => {
  const at = (weightKg: number, reps: number) => ({ weightKg, reps, seconds: 0 });

  it('is up when heavier, or the same weight for more reps', () => {
    expect(trend('weighted', at(82.5, 5), at(80, 8))).toBe('up');
    expect(trend('weighted', at(80, 9), at(80, 8))).toBe('up');
  });

  it('is held at the same weight and reps', () => {
    expect(trend('weighted', at(80, 8), at(80, 8))).toBe('held');
  });

  it('is down when lighter, or the same weight for fewer reps', () => {
    expect(trend('weighted', at(77.5, 12), at(80, 8))).toBe('down');
    expect(trend('weighted', at(80, 7), at(80, 8))).toBe('down');
  });

  it('is new with nothing to compare', () => {
    expect(trend('weighted', at(80, 8), null)).toBe('new');
  });

  it('compares holds for a timed lift', () => {
    expect(trend('timed', { weightKg: 0, reps: 0, seconds: 70 }, { weightKg: 0, reps: 0, seconds: 60 })).toBe(
      'up',
    );
  });
});

describe('how a session stands against last week', () => {
  it('matches the first session of a week with last week’s first', () => {
    const lastWeekFirst = press(5, [done(28, 8)]);
    const lastWeekSecond = press(8, [done(30, 8)]);
    const now = press(12, [done(28, 9)]);

    expect(liftStanding(now, [lastWeekFirst, lastWeekSecond, now])?.trend).toBe('up');
  });

  it('matches the second with the second', () => {
    const history = [press(5, [done(28, 8)]), press(8, [done(30, 8)]), press(12, [done(28, 9)])];
    const second = press(15, [done(30, 8)]);

    expect(liftStanding(second, [...history, second])?.trend).toBe('held');
  });

  it('falls back to last week’s last once last week runs out', () => {
    const history = [press(5, [done(28, 8)]), press(12, [done(28, 8)]), press(14, [done(28, 8)])];
    const third = press(16, [done(28, 7)]);

    expect(liftStanding(third, [...history, third])?.then).toMatchObject({ weightKg: 28, reps: 8 });
  });

  it('orders two sessions on the same day by when they started', () => {
    const lastWeek = [press(5, [done(28, 8)]), press(5, [done(20, 8)], 18)];
    const evening = press(12, [done(20, 9)], 18);
    const morning = press(12, [done(28, 8)]);

    expect(liftStanding(evening, [...lastWeek, morning, evening])?.trend).toBe('up');
  });

  it('is new in a lift’s first week', () => {
    const now = press(12, [done(28, 8)]);

    expect(liftStanding(now, [now])).toMatchObject({ trend: 'new', then: null, twoWeeksRunning: false });
  });

  it('counts two weeks running when what it beat had beaten its own week before', () => {
    const history = [press(1, [done(26, 8)]), press(5, [done(28, 8)])];
    const now = press(12, [done(28, 9)]);

    expect(liftStanding(now, [...history, now])).toMatchObject({ trend: 'up', twoWeeksRunning: true });
  });

  it('is not two weeks running when last week only held', () => {
    const history = [press(1, [done(28, 8)]), press(5, [done(28, 8)])];
    const now = press(12, [done(28, 9)]);

    expect(liftStanding(now, [...history, now])?.twoWeeksRunning).toBe(false);
  });

  it('skips past sessions where nothing counted', () => {
    const empty = press(5, [done(28, 8, { status: 'pending' })]);
    const now = press(12, [done(28, 8)]);

    expect(liftStanding(now, [empty, now])?.trend).toBe('new');
  });

  it('is nothing when nothing in the session counted', () => {
    const now = press(12, [done(28, 8, { setType: 'warmup' })]);

    expect(liftStanding(now, [now])).toBeNull();
  });
});

describe('a day’s heat level', () => {
  const standing = (over: Partial<LiftStanding>): LiftStanding => ({
    exerciseId: 'x',
    trend: 'new',
    twoWeeksRunning: false,
    now: { weightKg: 1, reps: 1, seconds: 0 },
    then: null,
    ...over,
  });

  it('is 0 with nothing completed', () => {
    expect(overloadLevel([], false)).toBe(0);
  });

  it('is Light when trained but nothing held or beaten (a first week lands here)', () => {
    expect(overloadLevel([], true)).toBe(1);
    expect(overloadLevel([standing({ trend: 'new' }), standing({ trend: 'down' })], true)).toBe(1);
  });

  it('is Moderate when last week was matched but nothing beaten', () => {
    expect(overloadLevel([standing({ trend: 'held' }), standing({ trend: 'down' })], true)).toBe(2);
  });

  it('is Strong when a lift beat last week', () => {
    expect(overloadLevel([standing({ trend: 'up' }), standing({ trend: 'down' })], true)).toBe(3);
  });

  it('is Peak when a lift beat last week for the second week running', () => {
    expect(overloadLevel([standing({ trend: 'up', twoWeeksRunning: true })], true)).toBe(4);
  });
});

describe('what beats last week', () => {
  it('is one more rep at the same weight, or the next weight up for five', () => {
    expect(beatTarget('weighted', { weightKg: 80, reps: 8, seconds: 0 }, 2.5)).toEqual({
      moreReps: { weightKg: 80, reps: 9 },
      heavier: { weightKg: 82.5, reps: 5 },
      longer: null,
    });
  });

  it('is a longer hold for a timed lift', () => {
    expect(beatTarget('timed', { weightKg: 0, reps: 0, seconds: 60 }, 2.5)).toEqual({
      moreReps: null,
      heavier: null,
      longer: 65,
    });
  });
});

describe('what the next session is judged against', () => {
  const today = '2026-10-14' as ISODate;

  it('is last week’s first session for this week’s first', () => {
    const history = [press(5, [done(28, 8)]), press(8, [done(30, 6)])];

    expect(nextMatch('shoulder-press', today, history)).toMatchObject({ weightKg: 28, reps: 8 });
  });

  it('moves on to last week’s second once this week has had one', () => {
    const history = [press(5, [done(28, 8)]), press(8, [done(30, 6)]), press(12, [done(28, 9)])];

    expect(nextMatch('shoulder-press', today, history)).toMatchObject({ weightKg: 30, reps: 6 });
  });

  it('stays on last week’s last once last week runs out', () => {
    const history = [press(5, [done(28, 8)]), press(12, [done(28, 9)]), press(13, [done(28, 9)])];

    expect(nextMatch('shoulder-press', today, history)).toMatchObject({ weightKg: 28, reps: 8 });
  });

  it('is nothing when last week had no session of the lift', () => {
    expect(nextMatch('shoulder-press', today, [press(12, [done(28, 9)])])).toBeNull();
    expect(nextMatch('bench', today, [press(5, [done(28, 8)])])).toBeNull();
  });
});
