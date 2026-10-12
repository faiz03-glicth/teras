import type { ISODate } from '@/shared/lib/date/isoDate';

import type { HistoryRow } from '../historyCsv';
import { planImport, type LibraryExercise, type PlanInput } from '../importPlan';

const LIBRARY = new Map<string, LibraryExercise>([
  [
    'bench-press-barbell',
    {
      id: 'bench-press-barbell',
      name: 'Bench Press (Barbell)',
      equipment: 'barbell',
      primaryMuscle: 'chest',
      type: 'weighted',
    },
  ],
  [
    'pull-up',
    { id: 'pull-up', name: 'Pull Up', equipment: 'bodyweight', primaryMuscle: 'lats', type: 'bodyweight' },
  ],
]);

let line = 1;
const set = (session: string, date: string, over: Partial<HistoryRow> = {}): HistoryRow => {
  line += 1;
  return {
    Set_ID: `${session}-S${line}`,
    Exercise_Log_ID: `${session}-E1`,
    Workout_Date: date,
    Body_Weight_kg: 70,
    Split: 'Push Day',
    Session_ID: session,
    Exercise_Order: 1,
    Exercise_Name: 'Barbell Bench Press',
    Primary_Muscle_Group: 'Chest',
    Secondary_Muscles: '',
    Equipment: 'Barbell',
    Set_Number: 1,
    Reps: 8,
    Load_kg: 60,
    Load_Basis: 'total barbell kg',
    line,
    ...over,
  };
};

const plan = (rows: HistoryRow[], over: Partial<PlanInput> = {}) =>
  planImport({
    rows,
    library: LIBRARY,
    owner: 'owner-1',
    existingDates: new Set(),
    existingSessions: [],
    today: '2026-10-12' as ISODate,
    ...over,
  });

describe('planImport', () => {
  it('turns a session into a workout exactly as written, at 18:00 in Kuala Lumpur for 100 minutes', () => {
    const rows = [
      set('W1', '2026-09-07', { Split: 'Back & Biceps' }),
      set('W1', '2026-09-07', { Split: 'Back & Biceps', Set_Number: 2, Load_kg: 62.5, Reps: 6 }),
      set('W1', '2026-09-07', {
        Split: 'Back & Biceps',
        Exercise_Log_ID: 'W1-E2',
        Exercise_Order: 2,
        Exercise_Name: 'Weighted Pull-Up',
        Load_kg: 10,
        Reps: 6,
        Load_Basis: 'external load added kg',
      }),
    ];
    const { workouts, issues, blockers } = plan(rows);
    expect(issues).toEqual([]);
    expect(blockers).toEqual([]);
    expect(workouts).toHaveLength(1);
    const [workout] = workouts;
    expect(workout).toMatchObject({
      sessionId: 'W1',
      name: 'Back & Biceps',
      date: '2026-09-07',
      startedAt: '2026-09-07T10:00:00.000Z',
      endedAt: '2026-09-07T11:40:00.000Z',
      bodyweightKg: 70,
      // 60×8 + 62.5×6 + (70 body + 10 added)×6
      totals: { volumeKg: 480 + 375 + 480, sets: 3, workouts: 1 },
    });
    expect(workout?.exercises.map((one) => [one.exerciseId, one.type, one.position])).toEqual([
      ['bench-press-barbell', 'weighted', 0],
      ['pull-up', 'bodyweight', 1],
    ]);
    expect(workout?.exercises[0]?.sets.map((one) => [one.position, one.weightKg, one.reps])).toEqual([
      [0, 60, 8],
      [1, 62.5, 6],
    ]);
  });

  it('gives the same ids on every run, and different ones to another person', () => {
    const rows = [set('W1', '2026-09-07')];
    const first = plan(rows).workouts[0];
    const again = plan(rows).workouts[0];
    const other = plan(rows, { owner: 'owner-2' }).workouts[0];
    expect(again?.id).toBe(first?.id);
    expect(again?.exercises[0]?.sets[0]?.id).toBe(first?.exercises[0]?.sets[0]?.id);
    expect(other?.id).not.toBe(first?.id);
    expect(first?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('leaves a day the phone already has, and a day after today', () => {
    const rows = [set('W1', '2026-09-07'), set('W2', '2026-09-09'), set('W3', '2026-10-13')];
    const { workouts, skipped } = plan(rows, { existingDates: new Set(['2026-09-09']) });
    expect(workouts.map((one) => one.sessionId)).toEqual(['W1']);
    expect(skipped).toEqual([
      { sessionId: 'W2', date: '2026-09-09', reason: 'the phone already has a workout that day' },
      { sessionId: 'W3', date: '2026-10-13', reason: 'after today' },
    ]);
  });

  it('plans nothing while a name has no match', () => {
    const { workouts, blockers } = plan([set('W1', '2026-09-07', { Exercise_Name: 'Zercher Squat' })]);
    expect(workouts).toEqual([]);
    expect(blockers).toEqual(['"Zercher Squat": no match']);
  });

  it('works out each day by the overload rule, in date order, against only what came before', () => {
    // Weekly bench: a first week, beaten, beaten again, then held.
    const rows = [
      set('W1', '2026-09-07', { Load_kg: 60 }),
      set('W2', '2026-09-14', { Load_kg: 62.5 }),
      set('W3', '2026-09-21', { Load_kg: 65 }),
      set('W4', '2026-09-28', { Load_kg: 65 }),
    ];
    expect(plan(rows).workouts.map((one) => [one.date, one.level])).toEqual([
      ['2026-09-07', 1],
      ['2026-09-14', 3],
      ['2026-09-21', 4],
      ['2026-09-28', 2],
    ]);
  });

  it("counts the phone's own sessions in a day's level", () => {
    const existing = {
      exerciseId: 'bench-press-barbell',
      type: 'weighted' as const,
      workoutId: 'phone-1',
      date: '2026-09-02' as ISODate,
      startedAt: '2026-09-02T10:00:00.000Z',
      sets: [{ status: 'done' as const, setType: 'normal' as const, weightKg: 70, reps: 8, seconds: null }],
    };
    const [below] = plan([set('W1', '2026-09-07', { Load_kg: 60 })], {
      existingSessions: [existing],
    }).workouts;
    expect(below?.level).toBe(1);
    const [beaten] = plan([set('W1', '2026-09-07', { Load_kg: 72.5 })], {
      existingSessions: [existing],
    }).workouts;
    expect(beaten?.level).toBe(3);
  });

  it('reports a load that does not fit the matched exercise, and a session that disagrees with itself', () => {
    const rows = [
      set('W1', '2026-09-07', { Exercise_Name: 'Weighted Pull-Up', Load_Basis: 'total barbell kg' }),
      set('W2', '2026-09-08', { Load_Basis: 'external load added kg' }),
      set('W3', '2026-09-09'),
      set('W3', '2026-09-10', { Set_Number: 2 }),
    ];
    const { issues, skipped } = plan(rows);
    expect(issues).toEqual([
      `line ${rows[0]?.line}: a bodyweight lift whose load is "total barbell kg"`,
      `line ${rows[1]?.line}: a weighted lift whose load is added weight`,
      'W3: more than one date',
    ]);
    expect(skipped).toContainEqual({ sessionId: 'W3', date: '2026-09-09', reason: 'inconsistent rows' });
  });
});
