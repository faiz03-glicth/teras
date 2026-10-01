import {
  BODYWEIGHT_KG,
  formatHeight,
  formatRest,
  formatWeight,
  HEIGHT_CM,
  REST_SECONDS,
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
});
