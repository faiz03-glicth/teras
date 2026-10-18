import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { LOCAL_READ, PREFETCH_IDLE_TIMEOUT_MS, SUMMARY_GC_MS } from '@/core/query/queryClient';
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
  /** Logged after its day: not ongoing, so no Resume bar, clock or in-progress card shows it. */
  pastLog: boolean;
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
    pastLog: workout.pastLog === true,
  };
}

/** PURE: the workout in progress, if it is one being trained now rather than a past day's log. */
export const liveWorkout = (summary: ActiveWorkoutSummary | null | undefined) =>
  summary && !summary.pastLog ? summary : null;

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

/** Where one logged workout is cached, under the history key. */
export const loggedWorkoutKey = (owner: WorkoutOwner, id: string | null) =>
  [...workoutKeys.history, owner, 'workout', id] as const;

/**
 * One workout as it was logged, for its detail screen. Kept under the history key, so finishing a
 * workout refreshes it along with every list it appears in.
 */
export function useLoggedWorkout(owner: WorkoutOwner, id: string | null) {
  const { workouts } = useRepositories();
  return useQuery({
    queryKey: loggedWorkoutKey(owner, id),
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
/**
 * What each exercise has to beat today: last week's matching session's best set (none in a first week).
 * Under the history prefix, so finishing or deleting a workout reads it again.
 */
export function useToBeat(owner: WorkoutOwner, exerciseIds: readonly string[], date: ISODate) {
  const { workouts } = useRepositories();
  const ids = [...new Set(exerciseIds)].sort();
  return useQuery({
    queryKey: [...workoutKeys.history, owner, 'toBeat', date, ids],
    queryFn: () => workouts.toBeat(owner, ids, date),
    enabled: ids.length > 0,
    networkMode: 'always',
  });
}

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

/** Where a set of exercises' records are cached, under the history key; order and repeats don't matter. */
export const exerciseBestsKey = (owner: WorkoutOwner, exerciseIds: readonly string[]) =>
  [...workoutKeys.history, owner, 'bests', uniqueSorted(exerciseIds)] as const;

const uniqueSorted = (ids: readonly string[]) => [...new Set(ids)].sort();

/**
 * Each exercise's records as they stand now, across every finished workout. Kept under the history key,
 * so finishing a workout that beats one refreshes it.
 */
export function useExerciseBests(owner: WorkoutOwner, exerciseIds: readonly string[], enabled = true) {
  const { workouts } = useRepositories();
  const ids = uniqueSorted(exerciseIds);
  return useQuery({
    queryKey: exerciseBestsKey(owner, ids),
    queryFn: () => workouts.bests(owner, ids),
    enabled: enabled && ids.length > 0,
    networkMode: 'always',
  });
}

/**
 * The Records list's summary: one row per exercise, folded from every set (about 23,000 over six years).
 * Read once, kept until a workout changes it, and held a while after Records closes.
 */
const allRecordsQuery = (workouts: ReturnType<typeof useRepositories>['workouts'], owner: WorkoutOwner) => ({
  ...LOCAL_READ,
  queryKey: [...workoutKeys.history, owner, 'records-all'],
  queryFn: () => workouts.records(owner),
  gcTime: SUMMARY_GC_MS,
});

/** Every exercise's record as it stands, the most recently trained first: the Records list. */
export function useAllRecords(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  return useQuery(allRecordsQuery(workouts, owner));
}

/**
 * Folds the Records summary in a quiet moment (Profile, which opens Records), so opening Records shows
 * it at once instead of reading every set while its page slides in. A no-op while the summary is fresh.
 */
export function usePrefetchAllRecords(owner: WorkoutOwner) {
  const { workouts } = useRepositories();
  const queryClient = useQueryClient();
  useEffect(() => {
    const prefetch = () => void queryClient.prefetchQuery(allRecordsQuery(workouts, owner));
    if (typeof requestIdleCallback !== 'function') {
      const timer = setTimeout(prefetch, PREFETCH_IDLE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    const handle = requestIdleCallback(prefetch, { timeout: PREFETCH_IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(handle);
  }, [owner, queryClient, workouts]);
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
