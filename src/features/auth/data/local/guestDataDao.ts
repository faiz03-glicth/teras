import { and, eq, inArray, isNull } from 'drizzle-orm';

import {
  appMeta,
  exerciseFavourites,
  profiles,
  workoutDays,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

export interface GuestDataDao {
  /**
   * Hands everything created in guest mode to the signed-in user, atomically:
   * guest-owned rows get the user's id, the guest profile is retired, and the guest markers are cleared.
   */
  reassignGuestData(guestId: string, userId: string, now: string): Promise<void>;
}

/** Data source: SQLite only. */
export function createGuestDataDao(db: AppDatabase): GuestDataDao {
  return {
    async reassignGuestData(guestId, userId, now) {
      db.transaction((tx) => {
        // Days logged as a guest become the user's and are marked to be sent, so they reach Streak after sign-in.
        tx.update(workoutDays)
          .set({ userId, dirty: true, updatedAt: now })
          .where(isNull(workoutDays.userId))
          .run();
        // The workout in progress and everything logged in it, so signing in mid-session loses nothing.
        // These stay on the device, so they are claimed but never marked to be sent.
        tx.update(workouts).set({ userId, updatedAt: now }).where(isNull(workouts.userId)).run();
        tx.update(workoutExercises)
          .set({ userId, updatedAt: now })
          .where(isNull(workoutExercises.userId))
          .run();
        tx.update(workoutSets).set({ userId, updatedAt: now }).where(isNull(workoutSets.userId)).run();
        // Favourites: the account keeps one of each, so a guest favourite it already has is dropped first.
        const accountFavourites = tx
          .select({ exerciseId: exerciseFavourites.exerciseId })
          .from(exerciseFavourites)
          .where(eq(exerciseFavourites.userId, userId));
        tx.delete(exerciseFavourites)
          .where(
            and(isNull(exerciseFavourites.userId), inArray(exerciseFavourites.exerciseId, accountFavourites)),
          )
          .run();
        tx.update(exerciseFavourites)
          .set({ userId, updatedAt: now })
          .where(isNull(exerciseFavourites.userId))
          .run();
        tx.update(profiles)
          .set({ userId, deletedAt: now, updatedAt: now })
          .where(and(eq(profiles.id, guestId), isNull(profiles.userId)))
          .run();
        tx.delete(appMeta)
          .where(inArray(appMeta.key, ['guest_id', 'guest_active']))
          .run();
      });
    },
  };
}
