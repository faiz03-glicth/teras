import { onlineManager } from '@tanstack/react-query';

import type { WorkoutDayRepository } from './WorkoutDayRepository';

/**
 * Sends the days that are waiting for the server right now, after a change to a day (finishing or deleting
 * a workout), instead of at the next time the app is opened. Best effort: a guest has no server to send to,
 * offline waits for the reconnect, and a failure leaves the days marked to be sent, which
 * usePushPendingWorkoutDays tries again. It never throws and never waits.
 */
export function pushDaysNow(
  workoutDays: Pick<WorkoutDayRepository, 'pushPending'>,
  userId: string | null,
): void {
  if (!userId || !onlineManager.isOnline()) return;
  workoutDays.pushPending(userId).catch((error: unknown) => {
    console.error(
      `[workoutDays] Could not push the day (${error instanceof Error ? error.name : 'unknown'})`,
    ); // TODO(Sentry)
  });
}
