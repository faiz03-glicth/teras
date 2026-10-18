import { useMemo } from 'react';

import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goBack, openExercise, useScreenSettled } from '@/shared/actions';

import { recordLine } from '../domain/records';
import { useAllRecords, useWorkoutOwner } from '../hooks/useWorkoutQueries';

/**
 * Rows drawn while Records slides in: more than the tallest phone shows at once. The rest follow once it
 * has settled, so the slide waits for a screenful of rows, not the whole list.
 */
export const FIRST_ROWS = 14;

/** One exercise's record, as the list words it. */
export interface RecordRowView {
  exerciseId: string;
  title: string;
  /** "102.5 kg · heaviest weight", "12 reps · most reps" or "1 min 15 s · longest hold". */
  record: string;
}

/**
 * Records: every exercise's record as it stands, the most recently trained first, each opening its
 * exercise. The same records Exercise detail shows and marks, worded as the Saved screen words them.
 */
export function useRecordsViewModel() {
  const owner = useWorkoutOwner();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const query = useAllRecords(owner);

  const rows = useMemo<RecordRowView[]>(
    () =>
      (query.data ?? []).map((record) => ({
        exerciseId: record.exerciseId,
        title: record.name,
        record: recordLine(record, unit),
      })),
    [query.data, unit],
  );
  const settled = useScreenSettled();
  const shown = useMemo(() => (settled ? rows : rows.slice(0, FIRST_ROWS)), [rows, settled]);
  const { refetch } = query;

  return {
    status: query.isError ? ('error' as const) : query.isPending ? ('loading' as const) : ('ready' as const),
    rows: shown,
    onOpenExercise: openExercise,
    onRetry: () => void refetch(),
    onBack: () => goBack(),
  };
}

export type RecordsViewModel = ReturnType<typeof useRecordsViewModel>;
