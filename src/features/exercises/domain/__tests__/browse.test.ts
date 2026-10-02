import type { ExerciseRow } from '@/core/db/schema';

import { browserSections, muscleBadge } from '../browse';

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

const LIBRARY = [
  row('bench', 'Bench Press (Barbell)'),
  row('curl', 'Bicep Curl (Dumbbell)', { equipment: 'dumbbell', primaryMuscle: 'biceps' }),
  row('squat', 'Squat (Barbell)', { primaryMuscle: 'quads' }),
];

describe('browserSections', () => {
  it('leads with favourites and recent exercises, then lists them all', () => {
    const sections = browserSections(LIBRARY, {
      query: '',
      favouriteIds: ['squat'],
      recentIds: ['curl', 'bench'],
    });

    expect(sections.filtered).toBe(false);
    expect(sections.favourites.map((one) => one.id)).toEqual(['squat']);
    expect(sections.recent.map((one) => one.id)).toEqual(['curl', 'bench']);
    expect(sections.matches.map((one) => one.id)).toEqual(['bench', 'curl', 'squat']);
  });

  it('shows only the matches while searching', () => {
    const sections = browserSections(LIBRARY, { query: 'bb', favouriteIds: ['squat'], recentIds: ['curl'] });

    expect(sections.filtered).toBe(true);
    expect(sections.favourites).toEqual([]);
    expect(sections.recent).toEqual([]);
    expect(sections.matches.map((one) => one.id)).toEqual(['bench', 'squat']);
  });

  it('passes over a favourite or recent exercise that is no longer in the library', () => {
    const sections = browserSections(LIBRARY, {
      query: '',
      favouriteIds: ['gone'],
      recentIds: ['gone', 'bench'],
    });

    expect(sections.favourites).toEqual([]);
    expect(sections.recent.map((one) => one.id)).toEqual(['bench']);
  });
});

describe('muscleBadge', () => {
  it('is the first two letters of the primary muscle, as the prototype marks a row', () => {
    expect(muscleBadge('chest')).toBe('CH');
    expect(muscleBadge('upper_back')).toBe('UP');
  });
});
