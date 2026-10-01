import type { Repositories } from '@/core/di';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import type { AuthUser } from '@/features/auth/domain/types';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';
import type { Profile } from '@/features/profile/domain/Profile';
import type { WorkoutDayRepository } from '@/features/workoutDays/data/WorkoutDayRepository';

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
    pushPending: mockFn<Days['pushPending']>(async () => 0),
  };
}

export function createFakeRepositories(): Repositories & {
  auth: FakeAuthRepository;
  profile: FakeProfileRepository;
  workoutDays: FakeWorkoutDayRepository;
} {
  return {
    auth: createFakeAuthRepository(),
    profile: createFakeProfileRepository(),
    workoutDays: createFakeWorkoutDayRepository(),
  };
}
