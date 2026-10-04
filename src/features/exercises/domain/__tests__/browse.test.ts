import type { ExerciseRow } from '@/core/db/schema';

import { browserSections, groupByMuscle, muscleBadge } from '../browse';

const row = (id: string, name: string, over: Partial<ExerciseRow> = {}): ExerciseRow => ({
  id,
  userId: null,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
  deletedAt: null,
  dirty: false,
  name,
  equipment: 'barbell',
  primaryMuscle: 'chest',
  secondaryMuscles: [],
  type: 'weighted',
  isCompound: true,
  isCustom: false,
  ...over,
});

// Real ids, so each takes its place in the curated library's order.
const BENCH = 'bench-press-barbell';
const CURL = 'bicep-curl-dumbbell';
const SQUAT = 'squat-barbell';
const DIP = 'bench-dip';
const FLY = 'chest-fly-dumbbell';

const LIBRARY = [
  row(BENCH, 'Bench Press (Barbell)'),
  row(CURL, 'Bicep Curl (Dumbbell)', { equipment: 'dumbbell', primaryMuscle: 'biceps' }),
  row(SQUAT, 'Squat (Barbell)', { primaryMuscle: 'quads' }),
];

describe('browserSections', () => {
  it('leads with favourites and recent exercises, then lists them all', () => {
    const sections = browserSections(LIBRARY, {
      query: '',
      favouriteIds: [SQUAT],
      recentIds: [CURL, BENCH],
    });

    expect(sections.filtered).toBe(false);
    expect(sections.searching).toBe(false);
    expect(sections.favourites.map((one) => one.id)).toEqual([SQUAT]);
    expect(sections.recent.map((one) => one.id)).toEqual([CURL, BENCH]);
    expect(sections.matches.map((one) => one.id)).toEqual([BENCH, CURL, SQUAT]);
  });

  it('shows only the matches while searching', () => {
    const sections = browserSections(LIBRARY, { query: 'bb', favouriteIds: [SQUAT], recentIds: [CURL] });

    expect(sections.filtered).toBe(true);
    expect(sections.searching).toBe(true);
    expect(sections.favourites).toEqual([]);
    expect(sections.recent).toEqual([]);
    expect(sections.matches.map((one) => one.id)).toEqual([BENCH, SQUAT]);
  });

  it('passes over a favourite or recent exercise that is no longer in the library', () => {
    const sections = browserSections(LIBRARY, {
      query: '',
      favouriteIds: ['gone'],
      recentIds: ['gone', BENCH],
    });

    expect(sections.favourites).toEqual([]);
    expect(sections.recent.map((one) => one.id)).toEqual([BENCH]);
  });
});

describe('muscleBadge', () => {
  it('is the first two letters of the primary muscle, as the prototype marks a row', () => {
    expect(muscleBadge('chest')).toBe('CH');
    expect(muscleBadge('upper_back')).toBe('UP');
  });
});

describe('browserSections, filtered by muscle and equipment', () => {
  const library = [
    row(BENCH, 'Bench Press (Barbell)', { secondaryMuscles: ['triceps'] }),
    row(DIP, 'Bench Dip', {
      equipment: 'bodyweight',
      primaryMuscle: 'triceps',
      secondaryMuscles: ['chest'],
    }),
    row(FLY, 'Chest Fly (Dumbbell)', { equipment: 'dumbbell' }),
    row(CURL, 'Bicep Curl (Dumbbell)', { equipment: 'dumbbell', primaryMuscle: 'biceps' }),
  ];
  const none = { query: '', favouriteIds: [CURL], recentIds: [BENCH] };

  it('finds every exercise that works a muscle, those it works most first', () => {
    const sections = browserSections(library, { ...none, muscle: 'chest' });

    expect(sections.filtered).toBe(true);
    expect(sections.searching).toBe(false);
    expect(sections.favourites).toEqual([]);
    expect(sections.matches.map((one) => one.id)).toEqual([BENCH, FLY, DIP]);
  });

  it('narrows to one kind of equipment', () => {
    expect(browserSections(library, { ...none, equipment: 'dumbbell' }).matches.map((one) => one.id)).toEqual(
      [FLY, CURL],
    );
  });

  it('combines a muscle, equipment and a search', () => {
    expect(
      browserSections(library, { ...none, muscle: 'chest', equipment: 'dumbbell' }).matches.map(
        (one) => one.id,
      ),
    ).toEqual([FLY]);
    expect(
      browserSections(library, { ...none, query: 'bench', muscle: 'chest' }).matches.map((one) => one.id),
    ).toEqual([BENCH, DIP]);
  });
});

describe('grouping exercises by muscle', () => {
  const ids = (groups: ReturnType<typeof groupByMuscle>) =>
    groups.map((group) => [group.muscle, group.rows.map((r) => r.id)]);

  it('puts each exercise under its primary muscle only, groups in library muscle order', () => {
    const rows = [
      row('fly', 'Cable Fly'),
      row('press', 'Overhead Press', { primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'] }),
      row('bench', 'Bench Press', { secondaryMuscles: ['triceps', 'shoulders'] }),
      row('pushdown', 'Tricep Pushdown', { primaryMuscle: 'triceps' }),
    ];

    expect(ids(groupByMuscle(rows, null))).toEqual([
      ['chest', ['fly', 'bench']],
      ['shoulders', ['press']],
      ['triceps', ['pushdown']],
    ]);
  });

  it('leads with the muscle chosen, keeping the order within each group', () => {
    const rows = [
      row('press', 'Overhead Press', { primaryMuscle: 'shoulders' }),
      row('bench', 'Bench Press', { secondaryMuscles: ['shoulders'] }),
      row('raise', 'Lateral Raise', { primaryMuscle: 'shoulders' }),
    ];

    expect(ids(groupByMuscle(rows, 'shoulders'))).toEqual([
      ['shoulders', ['press', 'raise']],
      ['chest', ['bench']],
    ]);
  });

  it('while searching, orders the groups by their best match, the muscle chosen still first', () => {
    // As a search for "shoulder press" finds them: the shoulder presses, then the bench presses.
    const rows = [
      row('press', 'Shoulder Press', { primaryMuscle: 'shoulders' }),
      row('bench', 'Bench Press', { secondaryMuscles: ['shoulders'] }),
      row('arnold', 'Arnold Press', { primaryMuscle: 'shoulders' }),
      row('close', 'Close Grip Bench Press', { primaryMuscle: 'triceps' }),
    ];

    expect(ids(groupByMuscle(rows, null, true))).toEqual([
      ['shoulders', ['press', 'arnold']],
      ['chest', ['bench']],
      ['triceps', ['close']],
    ]);
    expect(ids(groupByMuscle(rows, 'triceps', true))).toEqual([
      ['triceps', ['close']],
      ['shoulders', ['press', 'arnold']],
      ['chest', ['bench']],
    ]);
  });

  it('has no groups when nothing matches', () => {
    expect(groupByMuscle([], 'chest')).toEqual([]);
    expect(groupByMuscle([], null, true)).toEqual([]);
  });
});
