import { muscleOfRegion, regionShade } from '../bodyMap';

describe('regionShade', () => {
  it('shades the regions of the primary muscle strongest, then the secondary ones', () => {
    expect(regionShade('pectorals', { primary: ['chest'], secondary: ['triceps'] })).toBe('primary');
    expect(regionShade('triceps', { primary: ['chest'], secondary: ['triceps'] })).toBe('secondary');
    expect(regionShade('quadriceps', { primary: ['chest'], secondary: ['triceps'] })).toBe('none');
  });

  it('shades every region a muscle covers', () => {
    const calves = { primary: ['calves' as const], secondary: [] };

    expect(['gastrocnemius', 'lowerleg', 'tibialis'].map((region) => regionShade(region, calves))).toEqual([
      'primary',
      'primary',
      'primary',
    ]);
  });
});

describe('muscleOfRegion', () => {
  it('names the muscle a tapped region stands for', () => {
    expect(muscleOfRegion('pectorals')).toBe('chest');
    expect(muscleOfRegion('reardelts')).toBe('shoulders');
    expect(muscleOfRegion('nowhere')).toBeNull();
  });
});
