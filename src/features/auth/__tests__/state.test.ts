import { Storage } from 'expo-sqlite/kv-store';

import { testUser } from '@test/fakes/fakeRepositories';

import { routeGuards } from '../domain/guards';
import { useAuthStore } from '../state/authStore';

const initial = useAuthStore.getState();
beforeEach(() => useAuthStore.setState(initial, true));

describe('routeGuards', () => {
  it.each([
    ['booting', false, { canEnterApp: false, canEnterAuth: false }],
    ['booting', true, { canEnterApp: false, canEnterAuth: false }],
    ['signedOut', false, { canEnterApp: false, canEnterAuth: true }],
    ['signedOut', true, { canEnterApp: false, canEnterAuth: true }],
    ['signedIn', false, { canEnterApp: false, canEnterAuth: true }],
    ['signedIn', true, { canEnterApp: true, canEnterAuth: false }],
    ['guest', false, { canEnterApp: false, canEnterAuth: true }],
    ['guest', true, { canEnterApp: true, canEnterAuth: false }],
  ] as const)('%s, onboarded=%s', (status, onboarded, expected) => {
    expect(routeGuards(status, onboarded)).toMatchObject(expected);
  });
});

describe('authStore', () => {
  it('derives status from the user', () => {
    const { setUser } = useAuthStore.getState();
    setUser(testUser({ provider: 'guest' }));
    expect(useAuthStore.getState().status).toBe('guest');
    setUser(testUser({ provider: 'apple' }));
    expect(useAuthStore.getState().status).toBe('signedIn');
    setUser(null);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('applies remote session changes only to signed-in users', () => {
    const { setUser, applyRemoteSession } = useAuthStore.getState();
    setUser(testUser({ provider: 'guest' }));
    applyRemoteSession(null);
    expect(useAuthStore.getState().status).toBe('guest');

    setUser(testUser({ provider: 'google' }));
    applyRemoteSession(testUser({ provider: 'google', displayName: 'Renamed' }));
    expect(useAuthStore.getState().user?.displayName).toBe('Renamed');
    applyRemoteSession(null);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('persists only onboarding progress, never the user or session', () => {
    useAuthStore.getState().setUser(testUser());
    useAuthStore.getState().completeOnboarding();
    const saved = JSON.parse(Storage.getItemSync('teras.auth') ?? '{}');
    expect(Object.keys(saved.state).sort()).toEqual(['hasCompletedOnboarding']);
    expect(saved.state.hasCompletedOnboarding).toBe(true);
  });
});
