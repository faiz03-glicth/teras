import { countSets, countWorkouts, exercisePreview } from '../labels';

describe('counts', () => {
  it('pairs a number with its word, so nothing reads "1 sets"', () => {
    expect(countSets(1)).toBe('1 set');
    expect(countSets(14)).toBe('14 sets');
    expect(countWorkouts(1)).toBe('1 workout');
    expect(countWorkouts(0)).toBe('0 workouts');
  });
});

describe('exercisePreview', () => {
  const exercises = [
    { name: 'Bench Press (Barbell)', sets: 4 },
    { name: 'Overhead Press (Barbell)', sets: 4 },
    { name: 'Triceps Pushdown (Cable)', sets: 6 },
    { name: 'Lateral Raise (Dumbbell)', sets: 3 },
    { name: 'Chest Fly (Dumbbell)', sets: 3 },
  ];

  it('lists the first three exercises with their sets', () => {
    expect(exercisePreview(exercises).lines).toEqual([
      { sets: '4 sets', name: 'Bench Press (Barbell)' },
      { sets: '4 sets', name: 'Overhead Press (Barbell)' },
      { sets: '6 sets', name: 'Triceps Pushdown (Cable)' },
    ]);
  });

  it('says how many more there are', () => {
    expect(exercisePreview(exercises).more).toBe('See 2 more exercises');
    expect(exercisePreview(exercises.slice(0, 4)).more).toBe('See 1 more exercise');
  });

  it('has nothing more to say when they all fit', () => {
    expect(exercisePreview(exercises.slice(0, 3)).more).toBeNull();
    expect(exercisePreview([])).toEqual({ lines: [], more: null });
  });
});
