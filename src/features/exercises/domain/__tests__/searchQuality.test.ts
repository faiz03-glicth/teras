import type { Equipment, ExerciseRow, Muscle } from '@/core/db/schema';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createExerciseDao } from '../../data/local/exerciseDao';
import { browserSections, groupByMuscle } from '../browse';

/**
 * Search over the real, curated library, as the browser shows it: the matches under muscle headings, the
 * group with the best match first. Guards the ranking against a change to search or to the curation.
 */
let library: ExerciseRow[] = [];

beforeAll(async () => {
  library = await createExerciseDao(await createTestDatabase()).list(null);
});

interface Shown {
  headings: Muscle[];
  names: string[];
}

function shown(query: string, filters: { muscle?: Muscle; equipment?: Equipment } = {}): Shown {
  const found = browserSections(library, { query, favouriteIds: [], recentIds: [], ...filters });
  const groups = groupByMuscle(found.matches, filters.muscle ?? null, found.searching);
  return {
    headings: groups.map((group) => group.muscle),
    names: groups.flatMap((group) => group.rows.map((row) => row.name)),
  };
}

describe('searching the curated library', () => {
  it.each([
    [
      'shoulder press',
      [
        'Overhead Press (Barbell)',
        'Shoulder Press (Dumbbell)',
        'Shoulder Press (Machine)',
        'Shoulder Press (Cable)',
      ],
    ],
    [
      'dumbbell shoulder press',
      [
        'Shoulder Press (Dumbbell)',
        'Arnold Press (Dumbbell)',
        'Push Press (Dumbbell)',
        'Single Arm Shoulder Press (Dumbbell)',
      ],
    ],
    ['machine shoulder press', ['Shoulder Press (Machine)', 'Single Arm Shoulder Press (Machine)']],
    [
      'bench press',
      [
        'Bench Press (Barbell)',
        'Bench Press (Dumbbell)',
        'Bench Press (Machine)',
        'Bench Press (Cable)',
        'Bench Press (Band)',
        'Incline Bench Press (Barbell)',
      ],
    ],
    ['squat', ['Squat (Barbell)', 'Bodyweight Squat', 'Squat (Dumbbell)', 'Squat (Machine)']],
    ['deadlift', ['Deadlift (Barbell)', 'Deadlift (Dumbbell)', 'Deadlift (Machine)', 'Deadlift (Cable)']],
    ['lat pulldown', ['Lat Pulldown (Cable)']],
    [
      'bicep curl',
      ['Bicep Curl (Barbell)', 'Bicep Curl (Dumbbell)', 'Bicep Curl (Cable)', 'Bicep Curl (Machine)'],
    ],
    ['tricep pushdown', ['Triceps Pushdown (Cable)', 'Triceps Rope Pushdown (Cable)']],
    ['row', ['Bent Over Row (Barbell)', 'Bent Over Row (Dumbbell)']],
    ['ohp', ['Overhead Press (Barbell)']],
    ['rdl', ['Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)']],
    ['pull up', ['Pull Up']],
    ['chin ups', ['Chin Up']],
    ['calves', ['Standing Calf Raise (Machine)', 'Seated Calf Raise (Machine)', 'Calf Raise']],
  ])('"%s" shows the familiar exercises first', (query, first) => {
    expect(shown(query).names.slice(0, first.length)).toEqual(first);
  });

  it('heads the list with the muscle of the best match', () => {
    expect(shown('shoulder press').headings.slice(0, 2)).toEqual(['shoulders', 'chest']);
    expect(shown('press').headings.slice(0, 2)).toEqual(['chest', 'shoulders']);
    expect(shown('deadlift').headings).toEqual(['lower_back', 'hamstrings', 'glutes']);
    expect(shown('row').headings.slice(0, 2)).toEqual(['upper_back', 'shoulders']);
  });

  it('ranks the phrase above exercises sharing only one of its words', () => {
    const { names } = shown('shoulder press');

    // Every shoulder press, the dumbbell, machine and cable ones too, before the first bench press.
    const bench = names.indexOf('Bench Press (Barbell)');
    for (const press of ['Shoulder Press (Dumbbell)', 'Shoulder Press (Machine)', 'Shoulder Press (Cable)']) {
      expect(names.indexOf(press)).toBeLessThan(bench);
    }
  });

  it('combines a search with the equipment and muscle filters', () => {
    const dumbbell = shown('shoulder press', { equipment: 'dumbbell' });
    expect(dumbbell.names[0]).toBe('Shoulder Press (Dumbbell)');
    expect(dumbbell.names.every((name) => name.endsWith('(Dumbbell)'))).toBe(true);

    const shoulders = shown('press', { muscle: 'shoulders' });
    expect(shoulders.headings[0]).toBe('shoulders');
    expect(shoulders.names[0]).toBe('Overhead Press (Barbell)');
  });

  it('answers a half-typed word without its noise', () => {
    expect(shown('pres').names).not.toContain('Preacher Curl (Machine)');
    expect(shown('t bar').names).toEqual([
      'T Bar Row (Barbell)',
      'T Bar Row (Machine)',
      'Reverse T Bar Row (Machine)',
    ]);
  });
});
