import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import { createAuthApi } from '@/features/auth/data/remote/authApi';
import { expoAppleAuthService } from '@/features/auth/data/services/AppleAuthService';
import { expoCryptoService } from '@/features/auth/data/services/CryptoService';
import { googleSignInService } from '@/features/auth/data/services/GoogleAuthService';
import { SupabaseAuthRepository } from '@/features/auth/data/SupabaseAuthRepository';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import { createExerciseDao } from '@/features/exercises/data/local/exerciseDao';
import {
  LocalExerciseRepository,
  type ExerciseRepository,
} from '@/features/exercises/data/ExerciseRepository';
import { createProfileDao } from '@/features/profile/data/local/profileDao';
import { LocalFirstProfileRepository } from '@/features/profile/data/LocalFirstProfileRepository';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';
import { createProfileApi } from '@/features/profile/data/remote/profileApi';
import { createWorkoutDayDao } from '@/features/workoutDays/data/local/workoutDayDao';
import { createWorkoutDayApi } from '@/features/workoutDays/data/remote/workoutDayApi';
import {
  LocalFirstWorkoutDayRepository,
  type WorkoutDayRepository,
} from '@/features/workoutDays/data/WorkoutDayRepository';
import { createWorkoutDao } from '@/features/workouts/data/local/workoutDao';
import { LocalWorkoutRepository, type WorkoutRepository } from '@/features/workouts/data/WorkoutRepository';
import { deviceTimeZone, nowIso } from '@/shared/lib/date/deviceTimeZone';

import { requireEnv } from './config/env';
import { createAppMetaDao } from './db/appMetaDao';
import { db } from './db/client';
import { getSupabase } from './supabase/client';

/**
 * Repository interfaces the app depends on. Concrete implementations are registered in
 * createRepositories(); tests pass fakes to <DiProvider> instead.
 */
export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
  workoutDays: WorkoutDayRepository;
  exercises: ExerciseRepository;
  workouts: WorkoutRepository;
}

/** Composition root: the only place concrete data sources and services are wired together. */
export function createRepositories(): Repositories {
  const env = requireEnv();
  const supabase = getSupabase();

  googleSignInService.configure({
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  const profile = new LocalFirstProfileRepository({
    dao: createProfileDao(db),
    api: createProfileApi(supabase),
    now: nowIso,
    timeZone: deviceTimeZone,
  });

  const auth = new SupabaseAuthRepository({
    api: createAuthApi(supabase.auth),
    apple: expoAppleAuthService,
    google: googleSignInService,
    crypto: expoCryptoService,
    profiles: profile,
    appMeta: createAppMetaDao(db),
    guestData: createGuestDataDao(db),
    now: nowIso,
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });

  const workoutDays = new LocalFirstWorkoutDayRepository({
    dao: createWorkoutDayDao(db),
    api: createWorkoutDayApi(supabase),
    uuid: expoCryptoService.uuid,
    now: nowIso,
  });

  const exercises = new LocalExerciseRepository({
    dao: createExerciseDao(db),
    uuid: expoCryptoService.uuid,
    now: nowIso,
  });

  const workouts = new LocalWorkoutRepository({
    dao: createWorkoutDao(db),
    workoutDays,
    uuid: expoCryptoService.uuid,
    now: nowIso,
  });

  return { auth, profile, workoutDays, exercises, workouts };
}
