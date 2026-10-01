/** How dark a day is: 0 (no workout) to 4 (peak). What earns each level is the workout-days rule. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatCellState = 'default' | 'today' | 'selected' | 'future' | 'blank';

export interface HeatGridCell {
  /** Stable key; an ISO date (YYYY-MM-DD) for real days. */
  key: string;
  level: HeatLevel;
  state: HeatCellState;
  /** Spoken label for interactive cells, e.g. "Sep 24: Strong". */
  label?: string;
  /** The day's check-ins, for real days (the month view prints it on the tile). */
  count?: number;
}

/** Columns are weeks; each column holds up to 7 day cells, top to bottom. */
export interface HeatGrid {
  columns: readonly (readonly HeatGridCell[])[];
}

/** PURE: builds a grid column by column (the same order the cells animate in). */
export function buildLevelGrid(
  columns: number,
  rows: number,
  levelAt: (column: number, row: number) => HeatLevel,
): HeatGrid {
  return {
    columns: Array.from({ length: columns }, (_, column) =>
      Array.from({ length: rows }, (_, row) => ({
        key: `${column}-${row}`,
        level: levelAt(column, row),
        state: 'default' as const,
      })),
    ),
  };
}
