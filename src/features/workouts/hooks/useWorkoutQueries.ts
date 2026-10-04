import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';
import type { WorkoutOwner } from '@/features/workouts/data/local/workoutDao';
import type { Workout } from '@/features/workouts/data/WorkoutRepository';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * Who the workout belongs to: the signed-in user, or null for a guest. Guest rows carry no owner and
 * are claimed on sign-in, so this is the same rule the day push uses.
 */
export function useWorkoutOwner(): WorkoutOwner {
  return useAuthStore((state) => (state.status === 'signedIn' ? (state.user?.id ?? null) : null));
}

export const workoutKeys = {
  routines: (owner: WorkoutOwner) => ['workouts', 'routines', owner] as const,
  active: (owner: WorkoutOwner) => ['workouts', 'active', owner] as const,
  /**
   * Prefixes, not full keys: invalidating one refreshes it for every owner and date range beneath it.
   * Finishing a workout invalidates both, because the tabs stay mounted and Home would otherwise keep
   * showing the old day until its cache went stale.
   */
  history: ['workouts', 'history'] as const,
  days: ['workoutDays'] as const,
};

/** The routines this person can start from. Local, so it never waits on a network. */
export function useRoutines(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: workoutKeys.routines(owner),
    queryFn: () => workouts.routines(owner),
    networkMode: 'always',
  });
}

/** The workout in progress, or null. */
export function useActiveWorkout(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: workoutKeys.active(owner),
    queryFn: () => workouts.active(owner),
    networkMode: 'always',
  });
}

/** The workout in progress as the screens around it show it: what it is, not what is in each set. */
export interface ActiveWorkoutSummary {
  id: string;
  name: string;
  date: ISODate;
  startedAt: string;
  exerciseCount: number;
  setsDone: number;
}

function summariseActive(workout: Workout | null): ActiveWorkoutSummary | null {
  if (!workout) return null;
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    startedAt: workout.startedAt,
    exerciseCount: workout.exercises.length,
    setsDone: sets.filter((set) => set.status === 'done').length,
  };
}

/**
 * The workout in progress, summarised. Every digit typed into a set replaces the workout in the cache;
 * Home, the Workout tab and the rest only redraw when this summary changes (a set ticked, an exercise
 * added), not on every keystroke behind them. Same query as `useActiveWorkout`, read once.
 */
export function useActiveWorkoutSummary(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: workoutKeys.active(owner),
    queryFn: () => workouts.active(owner),
    select: summariseActive,
    networkMode: 'always',
  });
}

/**
 * Puts a workout the repository just returned straight into the cache. Every change returns the whole
 * workout, so the screen never re-reads the database after an edit — the set you ticked is already there.
 */
export function useSetActiveWorkout(owner: WorkoutOwner) {
  const queryClient = useQueryClient();
  return useCallback(
    (workout: Workout | null) => queryClient.setQueryData(workoutKeys.active(owner), workout),
    [owner, queryClient],
  );
}

/** The newest finished workouts: Home's feed. */
export function useRecentWorkouts(owner: WorkoutOwner, limit: number) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'recent', limit],
    queryFn: () => workouts.history(owner, limit),
    networkMode: 'always',
  });
}

/** Finished workouts dated within a range: one day's, or the Calendar's whole history. */
export function useWorkoutsBetween(owner: WorkoutOwner, from: ISODate, to: ISODate) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, from, to],
    queryFn: () => workouts.historyBetween(owner, from, to),
    networkMode: 'always',
  });
}

/**
 * One workout as it was logged, for its detail screen. Kept under the history key, so finishing a
 * workout refreshes it along with every list it appears in.
 */
export function useLoggedWorkout(owner: WorkoutOwner, id: string | null) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'workout', id],
    queryFn: () => (id ? workouts.logged(owner, id) : null),
    enabled: id !== null,
    networkMode: 'always',
  });
}

/**
 * What each exercise was the last time it was finished: the Previous column. Kept under the history
 * key, so finishing a workout refreshes it. While an added exercise is being looked up, the rows already
 * shown keep their values rather than blinking back to dashes.
 */
export function usePreviousSets(owner: WorkoutOwner, exerciseIds: readonly string[]) {
  const { workouts } = useRepositories();
  const ids = [...new Set(exerciseIds)].sort();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'previous', ids],
    queryFn: () => workouts.previousSets(owner, ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    networkMode: 'always',
  });
}

/**
 * Each exercise's records as they stand now, across every finished workout. Kept under the history key,
 * so finishing a workout that beats one refreshes it.
 */
export function useExerciseBests(owner: WorkoutOwner, exerciseIds: readonly string[], enabled = true) {
  const { workouts } = useRepositories();
  const ids = [...new Set(exerciseIds)].sort();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'bests', ids],
    queryFn: () => workouts.bests(owner, ids),
    enabled: enabled && ids.length > 0,
    networkMode: 'always',
  });
}

/** Every exercise's record as it stands, the most recently trained first: the Records list. */
export function useAllRecords(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'records-all'],
    queryFn: () => workouts.records(owner),
    networkMode: 'always',
  });
}

/** The personal records a finished workout set, for its Saved screen. */
export function useNewRecords(owner: WorkoutOwner, id: string | null) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'records', id],
    queryFn: () => (id ? workouts.newRecords(owner, id) : []),
    enabled: id !== null,
    networkMode: 'always',
  });
}
