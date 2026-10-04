const fs = require('node:fs');

const { describe, expect, it } = require('@jest/globals');

const { CATALOGUE, MIGRATION, builtIns, catalogue, imported, migration } = require('../build-curation');
const { classify, curate, fixName } = require('../curate');

const lift = (over) => ({
  id: 'lift',
  name: 'Bench Press (Barbell)',
  equipment: 'barbell',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  ...over,
});
const fromDataset = (exercise) => classify(exercise, { builtIn: false });
const SQUAT = lift({
  id: 'squat-barbell',
  name: 'Squat (Barbell)',
  primaryMuscle: 'quads',
  secondaryMuscles: ['hamstrings', 'glutes'],
});

describe('fixing dataset names', () => {
  it('mends broken encoding, typos and plurals', () => {
    expect(fixName('45в° Calf Press (Machine)')).toBe('Calf Press (Machine)');
    expect(fixName('Revers Fly (Cable)')).toBe('Reverse Fly (Cable)');
    expect(fixName('Incline Flyes (Dumbbell)')).toBe('Incline Fly (Dumbbell)');
    expect(fixName('Pull Ups')).toBe('Pull Up');
  });

  it('uses the names people at the gym know', () => {
    expect(fixName('One Arm Row (Dumbbell)')).toBe('Single Arm Row (Dumbbell)');
    expect(fixName('Alternate Heel Touchers')).toBe('Heel Touch');
    expect(fixName('Air Bike')).toBe('Bicycle Crunch');
  });
});

describe('classifying an exercise', () => {
  it('knows a familiar exercise by its movement, whatever it is called', () => {
    const press = lift({
      name: 'Military Press (Machine)',
      equipment: 'machine',
      primaryMuscle: 'shoulders',
    });

    expect(fromDataset(press)).toMatchObject({ family: 'overhead_press', tier: 0, modifiers: [] });
  });

  it('marks a variation by what it adds to the movement', () => {
    const press = lift({
      name: 'Single Arm Shoulder Press (Dumbbell)',
      equipment: 'dumbbell',
      primaryMuscle: 'shoulders',
    });

    expect(fromDataset(press)).toMatchObject({
      family: 'overhead_press',
      tier: 1,
      modifiers: ['single', 'arm'],
    });
  });

  it('drops what Teras does not log, saying why', () => {
    expect(fromDataset(lift({ name: 'Chest Stretch', equipment: 'bodyweight' })).drop).toBe(
      'a stretch or yoga pose',
    );
    expect(
      fromDataset(lift({ name: 'Squat To Press (Dumbbell)', equipment: 'dumbbell', primaryMuscle: 'quads' }))
        .drop,
    ).toBe('two movements in one');
    expect(fromDataset(lift({ name: 'Bench Press On Ball (Dumbbell)', equipment: 'dumbbell' })).drop).toBe(
      'needs an exercise ball',
    );
    expect(fromDataset(lift({ primaryMuscle: 'quads' })).drop).toBe(
      'named for another movement than it works',
    );
  });

  it('never drops a built-in', () => {
    expect(classify(lift({ name: 'Chest Stretch' }), { builtIn: true })).not.toHaveProperty('drop');
  });
});

describe('curating the library', () => {
  it("keeps every built-in and the plainest of near-duplicates, which the others' names then find", () => {
    const { kept, dropped } = curate(
      [SQUAT],
      [
        lift({
          id: 'lever-shoulder-press',
          name: 'Lever Shoulder Press (Machine)',
          equipment: 'machine',
          primaryMuscle: 'shoulders',
        }),
        lift({
          id: 'shoulder-press-machine',
          name: 'Shoulder Press (Machine)',
          equipment: 'machine',
          primaryMuscle: 'shoulders',
        }),
        lift({ id: 'full-squat', name: 'Full Squat (Barbell)', primaryMuscle: 'quads' }),
      ],
    );

    expect(kept.map((entry) => [entry.id, entry.aliases])).toEqual([
      ['squat-barbell', ['Full Squat (Barbell)']],
      ['shoulder-press-machine', ['Lever Shoulder Press (Machine)']],
    ]);
    expect(Object.fromEntries(dropped.map((entry) => [entry.id, entry.twinId]))).toEqual({
      'full-squat': 'squat-barbell',
      'lever-shoulder-press': 'shoulder-press-machine',
    });
  });

  it('ranks the built-ins first in library order, then familiar forms, then variations', () => {
    const { kept } = curate(
      [SQUAT, lift({ id: 'bench-press-barbell' })],
      [
        lift({
          id: 'single-arm-shoulder-press',
          name: 'Single Arm Shoulder Press (Dumbbell)',
          equipment: 'dumbbell',
          primaryMuscle: 'shoulders',
        }),
        lift({
          id: 'shoulder-press-dumbbell',
          name: 'Shoulder Press (Dumbbell)',
          equipment: 'dumbbell',
          primaryMuscle: 'shoulders',
        }),
      ],
    );

    expect(Object.fromEntries(kept.map((entry) => [entry.id, entry.rank]))).toEqual({
      'squat-barbell': 0,
      'bench-press-barbell': 1,
      'shoulder-press-dumbbell': 200,
      'single-arm-shoulder-press': 1000,
    });
  });

  it("files a built-in's movement on other equipment under the built-in's main muscle", () => {
    const { kept } = curate(
      [SQUAT],
      [
        lift({
          id: 'squat-dumbbell',
          name: 'Squat (Dumbbell)',
          equipment: 'dumbbell',
          primaryMuscle: 'glutes',
          secondaryMuscles: ['quads', 'hamstrings'],
        }),
      ],
    );

    expect(kept.find((entry) => entry.id === 'squat-dumbbell')).toMatchObject({
      newPrimaryMuscle: 'quads',
      newSecondaryMuscles: ['glutes', 'hamstrings'],
    });
  });
});

describe('the committed curation', () => {
  it('is what build-curation.js writes from migrations 0001 and 0004', () => {
    const library = builtIns();
    const records = imported();
    const { kept, dropped } = curate(library, records);

    expect(fs.readFileSync(MIGRATION, 'utf8')).toBe(
      migration(kept, dropped, library.length + records.length),
    );
    expect(fs.readFileSync(CATALOGUE, 'utf8')).toBe(catalogue(kept));
  });
});
