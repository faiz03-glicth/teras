import type { Repositories } from '@/core/di';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import type { AuthUser } from '@/features/auth/domain/types';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';
import type { Profile } from '@/features/profile/domain/Profile';
import type { ExerciseRepository } from '@/features/exercises/data/ExerciseRepository';
import type { RoutineRepository } from '@/features/routines/data/RoutineRepository';
import type { WorkoutDayRepository } from '@/features/workoutDays/data/WorkoutDayRepository';
import type { Workout, WorkoutRepository } from '@/features/workouts/data/WorkoutRepository';
import type { WorkoutDay } from '@/features/workoutDays/domain/WorkoutDay';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { mockFn } from './mockFn';

export const testUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'person@example.com',
  displayName: 'Faiz Ahmad',
  avatarUrl: null,
  provider: 'google',
  ...overrides,
});

export const testProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-1',
  userId: 'user-1',
  email: 'person@example.com',
  displayName: 'Faiz Ahmad',
  username: null,
  avatarUrl: null,
  provider: 'google',
  timeZone: 'Asia/Kuala_Lumpur',
  createdAt: '2026-09-24T00:00:00.000Z',
  updatedAt: '2026-09-24T00:00:00.000Z',
  ...overrides,
});

export type FakeAuthRepository = jest.Mocked<AuthRepository>;
export type FakeProfileRepository = jest.Mocked<ProfileRepository>;
export type FakeWorkoutDayRepository = jest.Mocked<WorkoutDayRepository>;

type Auth = AuthRepository;
type Prof = ProfileRepository;
type Days = WorkoutDayRepository;

export function createFakeAuthRepository(): FakeAuthRepository {
  return {
    isAppleAvailable: mockFn<Auth['isAppleAvailable']>(async () => true),
    signInWithApple: mockFn<Auth['signInWithApple']>(async () => testUser({ provider: 'apple' })),
    signInWithGoogle: mockFn<Auth['signInWithGoogle']>(async () => testUser({ provider: 'google' })),
    requestEmailOtp: mockFn<Auth['requestEmailOtp']>(async () => undefined),
    verifyEmailOtp: mockFn<Auth['verifyEmailOtp']>(async () => testUser({ provider: 'email' })),
    continueAsGuest: mockFn<Auth['continueAsGuest']>(async () =>
      testUser({ id: 'guest-1', provider: 'guest', email: null, displayName: null }),
    ),
    restoreSession: mockFn<Auth['restoreSession']>(async () => null),
    signOut: mockFn<Auth['signOut']>(async () => undefined),
    onAuthStateChange: mockFn<Auth['onAuthStateChange']>(() => () => undefined),
  };
}

export function createFakeProfileRepository(): FakeProfileRepository {
  return {
    getLocal: mockFn<Prof['getLocal']>(async () => testProfile()),
    saveFromAuth: mockFn<Prof['saveFromAuth']>(async (user) =>
      testProfile({ id: user.id, provider: user.provider }),
    ),
    ensureGuest: mockFn<Prof['ensureGuest']>(async (guestId) =>
      testProfile({ id: guestId, userId: null, provider: 'guest', email: null, displayName: null }),
    ),
    refreshFromRemote: mockFn<Prof['refreshFromRemote']>(async () => null),
    updateDisplayName: mockFn<Prof['updateDisplayName']>(async () => undefined),
    pushPendingEdits: mockFn<Prof['pushPendingEdits']>(async () => undefined),
  };
}

export function createFakeWorkoutDayRepository(): FakeWorkoutDayRepository {
  return {
    recordDay: mockFn<Days['recordDay']>(async (_owner, date, totals) => ({ date, ...totals, level: 2 })),
    list: mockFn<Days['list']>(async () => []),
    windowBefore: mockFn<Days['windowBefore']>(async () => []),
    pushPending: mockFn<Days['pushPending']>(async () => 0),
  };
}

type Exercises = ExerciseRepository;
export type FakeExerciseRepository = { [K in keyof Exercises]: jest.Mock };

export function createFakeExerciseRepository(): FakeExerciseRepository {
  return {
    list: mockFn<Exercises['list']>(async () => []),
    search: mockFn<Exercises['search']>(async () => []),
    get: mockFn<Exercises['get']>(async () => null),
    favourites: mockFn<Exercises['favourites']>(async () => []),
    setFavourite: mockFn<Exercises['setFavourite']>(async () => undefined),
    recent: mockFn<Exercises['recent']>(async () => []),
    create: mockFn<Exercises['create']>(async () => ({ ok: false, reason: 'Not set up in this test' })),
  };
}

type Workouts = WorkoutRepository;
export type FakeWorkoutRepository = { [K in keyof Workouts]: jest.Mock };

/** No workout in progress, and every change reports the empty workout back. */
export function createFakeWorkoutRepository(): FakeWorkoutRepository {
  const date = '2026-10-01' as ISODate;
  const empty: Workout = {
    id: 'workout-1',
    name: 'Workout',
    routineId: null,
    date,
    startedAt: '2026-10-01T09:00:00.000Z',
    endedAt: null,
    bodyweightKg: 70,
    exercises: [],
  };
  return {
    routines: mockFn<Workouts['routines']>(async () => []),
    history: mockFn<Workouts['history']>(async () => []),
    historyBetween: mockFn<Workouts['historyBetween']>(async () => []),
    start: mockFn<Workouts['start']>(async () => empty),
    active: mockFn<Workouts['active']>(async () => null),
    get: mockFn<Workouts['get']>(async () => null),
    logged: mockFn<Workouts['logged']>(async () => null),
    previousSets: mockFn<Workouts['previousSets']>(async () => ({})),
    newRecords: mockFn<Workouts['newRecords']>(async () => []),
    exerciseHistory: mockFn<Workouts['exerciseHistory']>(async () => []),
    addExercise: mockFn<Workouts['addExercise']>(async () => empty),
    removeExercise: mockFn<Workouts['removeExercise']>(async () => empty),
    addSet: mockFn<Workouts['addSet']>(async () => empty),
    updateSet: mockFn<Workouts['updateSet']>(async () => empty),
    setStatus: mockFn<Workouts['setStatus']>(async () => empty),
    finish: mockFn<Workouts['finish']>(async (): Promise<WorkoutDay> => ({
      date,
      volumeKg: 0,
      sets: 0,
      workouts: 0,
      level: 0,
    })),
    discard: mockFn<Workouts['discard']>(async () => undefined),
  };
}

type Routines = RoutineRepository;
export type FakeRoutineRepository = { [K in keyof Routines]: jest.Mock };

/** No routine to open; saving succeeds as a new routine. */
export function createFakeRoutineRepository(): FakeRoutineRepository {
  return {
    get: mockFn<Routines['get']>(async () => null),
    save: mockFn<Routines['save']>(async () => ({ ok: true, id: 'routine-1' })),
    remove: mockFn<Routines['remove']>(async () => undefined),
  };
}

export function createFakeRepositories(): Repositories & {
  auth: FakeAuthRepository;
  profile: FakeProfileRepository;
  workoutDays: FakeWorkoutDayRepository;
  exercises: FakeExerciseRepository;
  workouts: FakeWorkoutRepository;
  routines: FakeRoutineRepository;
} {
  return {
    auth: createFakeAuthRepository(),
    profile: createFakeProfileRepository(),
    workoutDays: createFakeWorkoutDayRepository(),
    exercises: createFakeExerciseRepository(),
    workouts: createFakeWorkoutRepository(),
    routines: createFakeRoutineRepository(),
  };
}
