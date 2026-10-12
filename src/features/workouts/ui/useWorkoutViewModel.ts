import { useExerciseList } from '@/features/exercises/hooks/useExerciseQueries';
import { LEVEL_NAMES } from '@/features/workoutDays/domain/WorkoutDay';
import { openExerciseLibrary, openNewRoutine, openRoutine, openRoutinePreview } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { recentDay } from '@/shared/lib/format/dates';

import { useStartWorkout } from '../hooks/useStartWorkout';
import {
  liveWorkout,
  useActiveWorkoutSummary,
  useRoutines,
  useWorkoutOwner,
} from '../hooks/useWorkoutQueries';

/** "5 exercises · Bench Press, Overhead Press, …": the count is labelled, and the names cut to one line. */
const routineLine = (count: number, names: readonly string[]) =>
  count === 0 ? 'No exercises yet' : `${count} exercise${count === 1 ? '' : 's'} · ${names.join(', ')}`;

/**
 * The Workout tab: pick up where you left off, start from nothing, or start from a routine.
 * Starting is the one thing here that writes, so it is the only thing that can fail.
 */
export function useWorkoutViewModel() {
  const owner = useWorkoutOwner();
  const today = useToday();
  const routines = useRoutines(owner);
  const active = useActiveWorkoutSummary(owner);
  const library = useExerciseList(owner);
  const { start, starting } = useStartWorkout();

  // A past day's log left unsaved is not ongoing: Start shows, and leads to that log to save or discard.
  const inProgress = liveWorkout(active.data);
  const isEmpty = (routineId: string) =>
    routines.data?.find((one) => one.id === routineId)?.exerciseCount === 0;

  return {
    loading: routines.isPending || active.isPending,
    starting,
    /** The workout in progress, if there is one: nothing new starts from here until it ends. */
    inProgress,
    routines: (routines.data ?? []).map((routine) => ({
      id: routine.id,
      name: routine.name,
      line: routineLine(routine.exerciseCount, routine.exercises),
      /** "Peak · yesterday": how the day it was last done stood. */
      last: routine.last
        ? {
            level: routine.last.level,
            label: `${LEVEL_NAMES[routine.last.level]} · ${recentDay(routine.last.date, today)}`,
          }
        : null,
    })),
    onStartEmpty: () => void start(),
    // A routine with nothing in it has nothing to preview or start: it opens to be filled instead.
    onOpenRoutine: (routineId: string) =>
      isEmpty(routineId) ? openRoutine(routineId) : openRoutinePreview(routineId),
    onStartRoutine: (routineId: string) =>
      isEmpty(routineId) ? openRoutine(routineId) : void start(routineId),
    onNewRoutine: () => openNewRoutine(),
    onEditRoutine: (routineId: string) => openRoutine(routineId),
    /** "104 exercises · by name, muscle or equipment": the library, a tap away. */
    libraryLine: library.data
      ? `${library.data.length} exercises · by name, muscle or equipment`
      : 'By name, muscle or equipment',
    onOpenLibrary: () => openExerciseLibrary(),
  };
}

export type WorkoutViewModel = ReturnType<typeof useWorkoutViewModel>;
