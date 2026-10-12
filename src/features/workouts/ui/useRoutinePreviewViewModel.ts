import { useMemo } from 'react';

import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { useRoutine } from '@/features/routines/hooks/useRoutineQueries';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { goBack, goTab, openRoutine } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { recentDay } from '@/shared/lib/format/dates';

import { toBeatText } from '../domain/toBeat';
import { useStartWorkout } from '../hooks/useStartWorkout';
import { useActiveWorkoutSummary, useRoutines, useToBeat, useWorkoutOwner } from '../hooks/useWorkoutQueries';

const count = (value: number, word: string) => `${value} ${word}${value === 1 ? '' : 's'}`;

/**
 * A routine before it starts: what it holds, how it went last time, and for each exercise what beats last
 * week's matching session (the wave darkens only when a lift does). Then Start, or Edit.
 */
export function useRoutinePreviewViewModel(id: string | null) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const routine = useRoutine(owner, id);
  const summaries = useRoutines(owner);
  const library = useExerciseList(owner);
  const active = useActiveWorkoutSummary(owner);
  const { start, starting } = useStartWorkout();

  const items = useMemo(() => routine.data?.items ?? [], [routine.data]);
  const toBeat = useToBeat(
    owner,
    items.map((item) => item.exerciseId),
    today,
  );
  const byId = useMemo(() => new Map((library.data ?? []).map((row) => [row.id, row])), [library.data]);

  const exercises = items.map((item) => {
    const exercise = byId.get(item.exerciseId);
    const name = exercise?.name ?? 'Exercise';
    const then = toBeat.data?.[item.exerciseId];
    const text = then ? toBeatText(exercise?.type ?? 'weighted', then, unit) : null;
    const sets = count(item.targetSets, 'set');
    return {
      key: item.key,
      name,
      line: `${sets} · ${text ? `last ${text.last}` : 'nothing to beat yet'}`,
      target: text?.target ?? null,
      heavier: text?.heavier ?? null,
      accessibilityLabel: text
        ? `${name}. ${sets}, last week ${text.last}. To beat: ${text.target}${text.heavier ? `, or ${text.heavier}` : ''}.`
        : `${name}. ${sets}. Nothing to beat yet: this week sets the mark.`,
    };
  });

  const name = routine.data?.name ?? '';
  const last = summaries.data?.find((one) => one.id === id)?.last ?? null;
  const totalSets = items.reduce((sum, item) => sum + item.targetSets, 0);
  const empty = items.length === 0;

  const status =
    id === null
      ? ('missing' as const)
      : routine.isError || library.isError || toBeat.isError
        ? ('error' as const)
        : routine.isPending || library.isPending || (!empty && toBeat.isPending)
          ? ('loading' as const)
          : routine.data === null
            ? ('missing' as const)
            : ('ready' as const);

  return {
    status,
    name,
    /** "5 exercises · 16 sets". */
    line: empty ? 'No exercises yet' : `${count(items.length, 'exercise')} · ${count(totalSets, 'set')}`,
    /** "Last time: Peak · yesterday", with that day's level; null when it was never done. */
    last: last
      ? { level: last.level, label: `Last time: ${LEVEL_NAMES[last.level]} · ${recentDay(last.date, today)}` }
      : null,
    exercises,
    starting,
    /** A routine with nothing in it has nothing to start: its one action opens it to fill. */
    startLabel: empty ? 'Add exercises' : active.data ? 'Resume workout' : `Start ${name}`,
    onStart: () => {
      if (!id) return;
      // One already running: start() takes them back to it rather than starting a second.
      if (empty) openRoutine(id);
      else void start(id);
    },
    onEdit: () => {
      if (id) openRoutine(id);
    },
    onBack: () => goBack(() => goTab('workout')),
    onRetry: () => {
      void routine.refetch();
      void library.refetch();
      void toBeat.refetch();
    },
  };
}

export type RoutinePreviewViewModel = ReturnType<typeof useRoutinePreviewViewModel>;
