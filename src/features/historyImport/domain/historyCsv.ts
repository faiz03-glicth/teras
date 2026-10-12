import { z } from 'zod';

/**
 * The six-year history export (one row per set), read and checked. Every row is external data: each one is
 * validated, never cast, and every problem is reported with its line rather than skipped quietly.
 */

export const HISTORY_COLUMNS = [
  'Set_ID',
  'Exercise_Log_ID',
  'Workout_Date',
  'Training_Year_Number',
  'Training_Year_Label',
  'Body_Weight_kg',
  'Height_cm',
  'Split',
  'Session_ID',
  'Exercise_Order',
  'Exercise_Name',
  'Primary_Muscle_Group',
  'Secondary_Muscles',
  'Equipment',
  'Set_Number',
  'Reps',
  'Load_kg',
  'Load_Basis',
] as const;

const decimal = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .transform(Number)
    .pipe(z.number().min(min).max(max));
const whole = (min: number, max: number) =>
  z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));
const text = z.string().trim().min(1).max(120);

const rowSchema = z.object({
  Set_ID: text,
  Exercise_Log_ID: text,
  // A real calendar day, read as written: no time zone ever touches it.
  Workout_Date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((day) => {
      const midnight = new Date(`${day}T00:00:00Z`);
      return !Number.isNaN(midnight.getTime()) && midnight.toISOString().startsWith(day);
    }),
  Body_Weight_kg: decimal(20, 400),
  Split: text,
  Session_ID: text,
  Exercise_Order: whole(1, 100),
  Exercise_Name: text,
  Primary_Muscle_Group: text,
  Secondary_Muscles: z.string().max(200),
  Equipment: text,
  Set_Number: whole(1, 100),
  Reps: whole(1, 1000),
  Load_kg: decimal(0, 2000),
  Load_Basis: text,
});

/** One set, as the file has it (only the columns the import uses). */
export type HistoryRow = z.infer<typeof rowSchema> & { line: number };

export interface HistoryParse {
  rows: HistoryRow[];
  /** Every problem, with its line (1 = the header). */
  issues: string[];
}

/** PURE: the fields of one CSV record (RFC 4180: quoted fields may hold commas and doubled quotes). */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      fields.push(field);
      field = '';
    } else field += char;
  }
  fields.push(field);
  return fields;
}

/** PURE: the file's rows, checked. A wrong header stops everything; a bad row is reported and left out. */
export function parseHistoryCsv(source: string): HistoryParse {
  const lines = source.replace(/^﻿/, '').split(/\r?\n/);
  const header = splitCsvLine(lines[0] ?? '');
  if (header.join(',') !== HISTORY_COLUMNS.join(',')) {
    return { rows: [], issues: [`line 1: the header is not the expected ${HISTORY_COLUMNS.length} columns`] };
  }
  const rows: HistoryRow[] = [];
  const issues: string[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    if (index === 0 || line.trim() === '') return;
    const at = index + 1;
    const fields = splitCsvLine(line);
    if (fields.length !== HISTORY_COLUMNS.length) {
      issues.push(`line ${at}: ${fields.length} fields, expected ${HISTORY_COLUMNS.length}`);
      return;
    }
    const record = Object.fromEntries(HISTORY_COLUMNS.map((column, i) => [column, fields[i] ?? '']));
    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      const wrong = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
      issues.push(`line ${at}: bad ${wrong.join(', ')}`);
      return;
    }
    if (seen.has(parsed.data.Set_ID)) {
      issues.push(`line ${at}: Set_ID ${parsed.data.Set_ID} appears twice`);
      return;
    }
    seen.add(parsed.data.Set_ID);
    rows.push({ ...parsed.data, line: at });
  });
  return { rows, issues };
}
