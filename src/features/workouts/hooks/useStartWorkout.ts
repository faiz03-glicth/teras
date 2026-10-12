import { useCallback, useState } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { openActiveWorkout } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { useActiveWorkoutSummary, useSetActiveWorkout, useWorkoutOwner } from './useWorkoutQueries';

/**
 * Starting a workout, from anywhere that offers it (Home, the Workout tab): empty, or from a routine. With
 * one already running it opens that one instead, so there are never two. Starting is a write, so it can
 * fail: it says so and nothing opens.
 */
export function useStartWorkout() {
  const { workouts } = useRepositories();
  const owner = useWorkoutOwner();
  const today = useToday();
  const bodyweightKg = useTrainingPreferencesStore((state) => state.bodyweightKg);
  const restSeconds = useTrainingPreferencesStore((state) => state.restSeconds);
  const active = useActiveWorkoutSummary(owner);
  const cacheWorkout = useSetActiveWorkout(owner);
  const [starting, setStarting] = useState(false);
  const inProgress = active.data ?? null;

  const start = useCallback(
    async (routineId?: string) => {
      // Something is already running: take them to it rather than starting a second one.
      if (inProgress) {
        openActiveWorkout();
        return;
      }
      if (starting) return;
      setStarting(true);
      try {
        const workout = await workouts.start(owner, { date: today, bodyweightKg, restSeconds, routineId });
        cacheWorkout(workout);
        haptics.success();
        openActiveWorkout();
      } catch (cause) {
        console.error(`[workouts] Could not start (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
        showInfo({ title: "Couldn't start", sub: 'Try again.' });
      } finally {
        setStarting(false);
      }
    },
    [bodyweightKg, cacheWorkout, inProgress, owner, restSeconds, starting, today, workouts],
  );

  return { start, starting };
}
