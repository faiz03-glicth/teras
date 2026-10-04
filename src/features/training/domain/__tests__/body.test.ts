import {
  BMI_BANDS,
  BMI_CATEGORY_LABELS,
  bmiOf,
  BODY_FAT_PERCENT,
  bandShare,
  bandStart,
  ffmiOf,
  formatIndex,
  stepBodyFatPercent,
} from '../body';

describe('bmiOf', () => {
  it('is the weight over the height squared, in metres', () => {
    expect(bmiOf(70, 170).value).toBeCloseTo(24.22, 2);
    expect(bmiOf(90, 180).value).toBeCloseTo(27.78, 2);
  });

  it('falls in the band whose lower edge it has reached', () => {
    const at = (bmi: number) => bmiOf(bmi * 4, 200).category; // 2 m tall: BMI = kg / 4
    expect(at(18.4)).toBe('underweight');
    expect(at(18.5)).toBe('normal');
    expect(at(24.9)).toBe('normal');
    expect(at(25)).toBe('overweight');
    expect(at(29.9)).toBe('overweight');
    expect(at(30)).toBe('obese');
  });

  it('says where it sits on the scale drawn, from BMI 15 at the start to 35 at the end', () => {
    expect(bmiOf(100, 200).position).toBeCloseTo(0.5, 5); // BMI 25
    expect(bmiOf(60, 200).position).toBe(0); // BMI 15
    expect(bmiOf(48, 200).position).toBe(0); // BMI 12: held at the start
    expect(bmiOf(160, 200).position).toBe(1); // BMI 40: held at the end
  });
});

describe('the BMI scale', () => {
  it('runs the four bands end to end, each as wide as its share of the scale', () => {
    expect(BMI_BANDS.map((band) => band.category)).toEqual(['underweight', 'normal', 'overweight', 'obese']);
    expect(BMI_BANDS.map(bandShare)).toEqual([0.175, 0.325, 0.25, 0.25]);
    BMI_BANDS.slice(1).forEach((band, index) => expect(band.from).toBe(BMI_BANDS[index]?.to));
  });

  it('starts each band where the one before ends, along the bar from 0 to 1', () => {
    expect(BMI_BANDS.map(bandStart)).toEqual([0, 0.175, 0.5, 0.75]);
  });

  it('names each band as the prototype does', () => {
    expect(BMI_BANDS.map((band) => BMI_CATEGORY_LABELS[band.category])).toEqual([
      'Underweight',
      'Normal weight',
      'Overweight',
      'Obese',
    ]);
  });
});

describe('ffmiOf', () => {
  it('is the lean mass over the height squared, normalised to 1.8 m', () => {
    // Lean mass 70 × 0.82 = 57.4 kg; 57.4 / 1.7² + 6.1 × (1.8 − 1.7) = 20.47.
    const { value, leanKg } = ffmiOf(70, 170, 18);
    expect(leanKg).toBeCloseTo(57.4, 5);
    expect(value).toBeCloseTo(20.47, 2);
  });

  it('needs no normalising at 1.8 m', () => {
    expect(ffmiOf(81, 180, 20).value).toBeCloseTo(20, 5); // 64.8 / 3.24
  });
});

describe('stepBodyFatPercent', () => {
  it('moves one percent a tap, between 3 % and 50 %', () => {
    expect(BODY_FAT_PERCENT).toEqual({ min: 3, max: 50, default: 18 });
    expect(stepBodyFatPercent(18, 1)).toBe(19);
    expect(stepBodyFatPercent(18, -1)).toBe(17);
    expect(stepBodyFatPercent(50, 1)).toBe(50);
    expect(stepBodyFatPercent(3, -1)).toBe(3);
  });
});

describe('formatIndex', () => {
  it('shows BMI and FFMI to one decimal place', () => {
    expect(formatIndex(24.2215)).toBe('24.2');
    expect(formatIndex(20)).toBe('20.0');
  });
});
