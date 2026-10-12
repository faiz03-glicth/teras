import { toBeatText } from '../toBeat';

const best = (weightKg: number, reps: number, seconds = 0) => ({ weightKg, reps, seconds });

describe('what beats last week, in words', () => {
  it('is one more rep, or the next plate up for five or more', () => {
    expect(toBeatText('weighted', best(80, 8), 'kg')).toEqual({
      last: '80 kg × 8',
      target: '80 kg × 9',
      heavier: '82.5 kg × 5+',
    });
  });

  it('steps 5 lb on a pound scale', () => {
    expect(toBeatText('weighted', best(100 / 2.20462, 8), 'lb').heavier).toBe('105 lb × 5+');
  });

  it('counts a bodyweight lift by its reps, or by the weight added', () => {
    expect(toBeatText('bodyweight', best(0, 12), 'kg')).toEqual({
      last: '12 reps',
      target: '13 reps',
      heavier: '+2.5 kg × 5+',
    });
    expect(toBeatText('bodyweight', best(10, 6), 'kg').target).toBe('+10 kg × 7');
  });

  it('is a longer hold for a timed lift, with no heavier way', () => {
    expect(toBeatText('timed', best(0, 0, 60), 'kg')).toEqual({
      last: '60 s',
      target: '65 s',
      heavier: null,
    });
  });
});
