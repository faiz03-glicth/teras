import { dayTotals, type WorkoutForVolume } from '../totals';

const weighted = (reps: number, weightKg: number) =>
  ({ status: 'done', type: 'weighted', reps, weightKg }) as const;
const bodyweight = (reps: number, addedKg: number | null = null) =>
  ({ status: 'done', type: 'bodyweight', reps, weightKg: addedKg }) as const;
const timed = (seconds: number) =>
  ({ status: 'done', type: 'timed', reps: null, weightKg: null, seconds }) as const;

const workout = (sets: WorkoutForVolume['sets'], bodyweightKg = 70): WorkoutForVolume => ({
  bodyweightKg,
  sets,
});

describe('dayTotals', () => {
  it('is all zeros for a day with no workouts', () => {
    expect(dayTotals([])).toEqual({ volumeKg: 0, sets: 0, workouts: 0 });
  });

  it('counts a weighted set as reps × weight', () => {
    expect(dayTotals([workout([weighted(8, 60), weighted(8, 60)])])).toEqual({
      volumeKg: 960,
      sets: 2,
      workouts: 1,
    });
  });

  it('counts a bodyweight set against the bodyweight the workout started with', () => {
    expect(dayTotals([workout([bodyweight(10)], 72)])).toMatchObject({ volumeKg: 720, sets: 1 });
  });

  it('adds any extra weight to the bodyweight', () => {
    expect(dayTotals([workout([bodyweight(10, 5)], 72)])).toMatchObject({ volumeKg: 770 });
  });

  it('counts a timed set but gives it no volume', () => {
    expect(dayTotals([workout([timed(45)])])).toEqual({ volumeKg: 0, sets: 1, workouts: 1 });
  });

  it('ignores sets that were never completed', () => {
    const sets = [
      weighted(8, 60),
      { status: 'pending', type: 'weighted', reps: 8, weightKg: 60 },
      { status: 'skipped', type: 'weighted', reps: 8, weightKg: 60 },
    ] as const;
    expect(dayTotals([workout(sets)])).toEqual({ volumeKg: 480, sets: 1, workouts: 1 });
  });

  it('does not count a workout where nothing was completed', () => {
    const abandoned = workout([{ status: 'pending', type: 'weighted', reps: 8, weightKg: 60 }]);
    expect(dayTotals([abandoned])).toEqual({ volumeKg: 0, sets: 0, workouts: 0 });
  });

  it('adds up every workout of the day, each with its own bodyweight', () => {
    const morning = workout([bodyweight(10)], 70);
    const evening = workout([bodyweight(10)], 80);
    expect(dayTotals([morning, evening])).toEqual({ volumeKg: 1500, sets: 2, workouts: 2 });
  });

  it('treats a missing weight or rep count as nothing, rather than failing', () => {
    const sets = [
      { status: 'done', type: 'weighted', reps: 8, weightKg: null },
      { status: 'done', type: 'weighted', reps: null, weightKg: 60 },
    ] as const;
    expect(dayTotals([workout(sets)])).toEqual({ volumeKg: 0, sets: 2, workouts: 1 });
  });
});
