import { HISTORY_COLUMNS, parseHistoryCsv, splitCsvLine } from '../historyCsv';

type Column = (typeof HISTORY_COLUMNS)[number];

const HEADER = HISTORY_COLUMNS.join(',');
const SAMPLE: Record<Column, string> = {
  Set_ID: 'S1',
  Exercise_Log_ID: 'E1',
  Workout_Date: '2021-01-03',
  Training_Year_Number: '1',
  Training_Year_Label: 'Training Year 1 (2021)',
  Body_Weight_kg: '65.0',
  Height_cm: '163',
  Split: 'Shoulder Push',
  Session_ID: 'W1',
  Exercise_Order: '1',
  Exercise_Name: 'Dumbbell Shoulder Press',
  Primary_Muscle_Group: 'Shoulders',
  Secondary_Muscles: 'Triceps',
  Equipment: 'Dumbbells',
  Set_Number: '1',
  Reps: '12',
  Load_kg: '8',
  Load_Basis: 'kg per dumbbell',
};
const row = (over: Partial<Record<Column, string>> = {}) =>
  HISTORY_COLUMNS.map((column) => over[column] ?? SAMPLE[column]).join(',');

describe('splitCsvLine', () => {
  it('keeps commas and doubled quotes inside a quoted field', () => {
    expect(splitCsvLine('a,"b, c","say ""hi""",')).toEqual(['a', 'b, c', 'say "hi"', '']);
  });
});

describe('parseHistoryCsv', () => {
  it('reads a row exactly as written, numbers as numbers', () => {
    const { rows, issues } = parseHistoryCsv(`${HEADER}\r\n${row({ Load_kg: '22.5' })}\r\n`);
    expect(issues).toEqual([]);
    expect(rows).toEqual([
      expect.objectContaining({ Set_ID: 'S1', Workout_Date: '2021-01-03', Load_kg: 22.5, Reps: 12, line: 2 }),
    ]);
  });

  it('stops on a header that is not the expected one', () => {
    const { rows, issues } = parseHistoryCsv(`Set_ID,Reps\n${row()}`);
    expect(rows).toEqual([]);
    expect(issues).toEqual(['line 1: the header is not the expected 18 columns']);
  });

  it('reports a bad row with its line and leaves it out', () => {
    const source = [
      HEADER,
      row({ Set_ID: 'S1', Reps: '8.5' }),
      row({ Set_ID: 'S2', Load_kg: '-5' }),
      row({ Set_ID: 'S3', Workout_Date: '2021-02-30' }),
      'S4,too,few',
      row({ Set_ID: 'S5' }),
    ].join('\n');
    const { rows, issues } = parseHistoryCsv(source);
    expect(rows.map((one) => one.Set_ID)).toEqual(['S5']);
    expect(issues).toEqual([
      'line 2: bad Reps',
      'line 3: bad Load_kg',
      'line 4: bad Workout_Date',
      'line 5: 3 fields, expected 18',
    ]);
  });

  it('refuses a Set_ID seen before', () => {
    const { rows, issues } = parseHistoryCsv([HEADER, row(), row()].join('\n'));
    expect(rows).toHaveLength(1);
    expect(issues).toEqual(['line 3: Set_ID S1 appears twice']);
  });
});
