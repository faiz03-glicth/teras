import {
  weightNumber,
  BODYWEIGHT_KG,
  bodyweightFields,
  formatHeight,
  formatRest,
  formatVolume,
  formatWeight,
  HEIGHT_CM,
  heightFields,
  parseBodyweightKg,
  parseHeightCm,
  parseRestSeconds,
  REST_SECONDS,
  restFields,
  stepBodyweightKg,
  stepHeightCm,
  stepRestSeconds,
} from '../preferences';

describe('stepBodyweightKg', () => {
  it('moves by 0.1 kg in kilograms and 0.1 lb in pounds', () => {
    expect(stepBodyweightKg(70, 1, 'kg')).toBe(70.1);
    expect(stepBodyweightKg(70, -1, 'kg')).toBe(69.9);
    expect(formatWeight(stepBodyweightKg(70, 1, 'lb'), 'lb')).toBe('154.4 lb');
    expect(formatWeight(stepBodyweightKg(70, -1, 'lb'), 'lb')).toBe('154.2 lb');
  });

  it('never drifts, however many times it is tapped', () => {
    let kg = 70;
    for (let tap = 0; tap < 30; tap += 1) kg = stepBodyweightKg(kg, 1, 'kg');
    expect(kg).toBe(73);

    let pounds = 70;
    for (let tap = 0; tap < 57; tap += 1) pounds = stepBodyweightKg(pounds, 1, 'lb');
    expect(formatWeight(pounds, 'lb')).toBe('160 lb');
  });

  it('comes back to where it started when a tap is undone', () => {
    expect(stepBodyweightKg(stepBodyweightKg(70, 1, 'kg'), -1, 'kg')).toBe(70);
    const up = stepBodyweightKg(70, 1, 'lb');
    expect(formatWeight(stepBodyweightKg(up, -1, 'lb'), 'lb')).toBe('154.3 lb');
  });

  it('stays within the allowed range', () => {
    expect(stepBodyweightKg(BODYWEIGHT_KG.min, -1, 'kg')).toBe(BODYWEIGHT_KG.min);
    expect(stepBodyweightKg(BODYWEIGHT_KG.max, 1, 'kg')).toBe(BODYWEIGHT_KG.max);
  });
});

describe('stepHeightCm', () => {
  it('moves by 1 cm in metric and 1 inch in imperial', () => {
    expect(stepHeightCm(170, 1, 'kg')).toBe(171);
    expect(stepHeightCm(170, -1, 'kg')).toBe(169);
    expect(formatHeight(stepHeightCm(170, 1, 'lb'), 'lb')).toBe('5 ft 8 in');
    expect(formatHeight(stepHeightCm(170, -1, 'lb'), 'lb')).toBe('5 ft 6 in');
  });

  it('stays within the allowed range', () => {
    expect(stepHeightCm(HEIGHT_CM.min, -1, 'kg')).toBe(HEIGHT_CM.min);
    expect(stepHeightCm(HEIGHT_CM.max, 1, 'kg')).toBe(HEIGHT_CM.max);
  });
});

describe('stepRestSeconds', () => {
  it('moves by 5 seconds between 15 seconds and 5 minutes', () => {
    expect(stepRestSeconds(90, 1)).toBe(95);
    expect(stepRestSeconds(90, -1)).toBe(85);
    expect(stepRestSeconds(REST_SECONDS.min, -1)).toBe(REST_SECONDS.min);
    expect(stepRestSeconds(REST_SECONDS.max, 1)).toBe(REST_SECONDS.max);
  });
});

describe('formatting', () => {
  it('shows weight to one decimal, without a trailing zero', () => {
    expect(formatWeight(70, 'kg')).toBe('70 kg');
    expect(formatWeight(70.5, 'kg')).toBe('70.5 kg');
    expect(formatWeight(70, 'lb')).toBe('154.3 lb');
  });

  it('shows height in centimetres, or feet and inches', () => {
    expect(formatHeight(170, 'kg')).toBe('170 cm');
    expect(formatHeight(170, 'lb')).toBe('5 ft 7 in');
    expect(formatHeight(182.88, 'lb')).toBe('6 ft 0 in');
  });

  it('shows rest with its units', () => {
    expect(formatRest(45)).toBe('45 s');
    expect(formatRest(60)).toBe('1 min');
    expect(formatRest(90)).toBe('1 min 30 s');
    expect(formatRest(95)).toBe('1 min 35 s');
  });

  it('shows training volume in whole units, its thousands grouped', () => {
    expect(formatVolume(4820, 'kg')).toBe('4,820 kg');
    expect(formatVolume(4819.6, 'kg')).toBe('4,820 kg');
    expect(formatVolume(950, 'kg')).toBe('950 kg');
    expect(formatVolume(1234567, 'kg')).toBe('1,234,567 kg');
    expect(formatVolume(0, 'kg')).toBe('0 kg');
  });

  it('converts volume to pounds only for display', () => {
    expect(formatVolume(4820, 'lb')).toBe('10,626 lb');
  });
});

describe('typing a value instead of stepping it', () => {
  it('lays the value out as it reads, one field per number', () => {
    expect(bodyweightFields(70, 'kg').map((f) => [f.text, f.suffix])).toEqual([['70', 'kg']]);
    expect(bodyweightFields(70, 'lb').map((f) => [f.text, f.suffix])).toEqual([['154.3', 'lb']]);
    expect(heightFields(170, 'kg').map((f) => [f.text, f.suffix])).toEqual([['170', 'cm']]);
    expect(heightFields(170, 'lb').map((f) => [f.text, f.suffix])).toEqual([
      ['5', 'ft'],
      ['7', 'in'],
    ]);
    expect(restFields(90).map((f) => [f.text, f.suffix])).toEqual([
      ['1', 'min'],
      ['30', 's'],
    ]);
    expect(restFields(45).map((f) => f.text)).toEqual(['0', '45']);
  });

  it('reads bodyweight in the unit shown, to the tenth, and stores kilograms', () => {
    expect(parseBodyweightKg('82.5', 'kg')).toBe(82.5);
    expect(parseBodyweightKg('82,46', 'kg')).toBe(82.5);
    expect(parseBodyweightKg(' 90 ', 'kg')).toBe(90);
    // Typed in pounds, shown back exactly as typed.
    expect(formatWeight(parseBodyweightKg('180', 'lb') ?? 0, 'lb')).toBe('180 lb');
    expect(formatWeight(parseBodyweightKg('154.7', 'lb') ?? 0, 'lb')).toBe('154.7 lb');
  });

  it('reads height as centimetres, or as feet and inches', () => {
    expect(parseHeightCm(['182'], 'kg')).toBe(182);
    expect(parseHeightCm(['182.4'], 'kg')).toBe(182);
    expect(formatHeight(parseHeightCm(['6', '1'], 'lb') ?? 0, 'lb')).toBe('6 ft 1 in');
    // A blank part is zero, and inches past 12 carry into feet.
    expect(formatHeight(parseHeightCm(['5', ''], 'lb') ?? 0, 'lb')).toBe('5 ft 0 in');
    expect(formatHeight(parseHeightCm(['5', '14'], 'lb') ?? 0, 'lb')).toBe('6 ft 2 in');
  });

  it('reads rest as minutes and seconds, carrying seconds past 60', () => {
    expect(parseRestSeconds(['2', '0'])).toBe(120);
    expect(parseRestSeconds(['1', '30'])).toBe(90);
    expect(parseRestSeconds(['0', '90'])).toBe(90);
    expect(parseRestSeconds(['', '45'])).toBe(45);
  });

  it('keeps a typed value within the same range as the steppers', () => {
    expect(parseBodyweightKg('900', 'kg')).toBe(BODYWEIGHT_KG.max);
    expect(parseBodyweightKg('5', 'kg')).toBe(BODYWEIGHT_KG.min);
    expect(parseHeightCm(['999'], 'kg')).toBe(HEIGHT_CM.max);
    expect(parseHeightCm(['3', '0'], 'lb')).toBe(HEIGHT_CM.min);
    expect(parseRestSeconds(['0', '5'])).toBe(REST_SECONDS.min);
    expect(parseRestSeconds(['9', '0'])).toBe(REST_SECONDS.max);
  });

  it('reads nothing from a blank or a non-number, so the value stays as it was', () => {
    expect(parseBodyweightKg('', 'kg')).toBeNull();
    expect(parseBodyweightKg('abc', 'kg')).toBeNull();
    expect(parseBodyweightKg('7.0.1', 'kg')).toBeNull();
    expect(parseHeightCm([''], 'kg')).toBeNull();
    expect(parseHeightCm(['', ''], 'lb')).toBeNull();
    expect(parseHeightCm(['5', 'x'], 'lb')).toBeNull();
    expect(parseRestSeconds(['', ''])).toBeNull();
  });
});

describe('weightNumber', () => {
  it('is the weight in the unit shown, without the unit: "70", "70.5", "154.3"', () => {
    expect(weightNumber(70, 'kg')).toBe('70');
    expect(weightNumber(70.5, 'kg')).toBe('70.5');
    expect(weightNumber(70, 'lb')).toBe('154.3');
  });

  it('is what formatWeight puts before the unit', () => {
    expect(formatWeight(70.5, 'kg')).toBe(`${weightNumber(70.5, 'kg')} kg`);
  });
});
