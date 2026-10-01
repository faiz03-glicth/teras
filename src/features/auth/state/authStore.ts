import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import {
  statusFor,
  type AuthIntent,
  type AuthProvider,
  type AuthStatus,
  type AuthUser,
} from '../domain/types';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  intent: AuthIntent | null;
  /** The sign-in currently in flight; every other auth control is disabled while set. */
  pendingProvider: AuthProvider | null;
  hasCompletedOnboarding: boolean;

  setUser: (user: AuthUser | null) => void;
  /** Applies a Supabase auth event: refreshes the signed-in user, or signs out if the remote session ended. */
  applyRemoteSession: (user: AuthUser | null) => void;
  setIntent: (intent: AuthIntent | null) => void;
  setPendingProvider: (provider: AuthProvider | null) => void;
  completeOnboarding: () => void;
  /** Shows Get Started again on purpose (Profile → Replay Get Started). */
  restartOnboarding: () => void;
}

/**
 * Session status and onboarding progress. The Supabase session itself is never stored here
 * (it lives encrypted in LargeSecureStore); only onboarding progress is persisted.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'booting',
      user: null,
      intent: null,
      pendingProvider: null,
      hasCompletedOnboarding: false,

      setUser: (user) => set({ user, status: statusFor(user) }),
      applyRemoteSession: (user) => {
        // Sign-ins are applied by the sign-in flows (they persist the profile first); guests have no remote session.
        if (get().status !== 'signedIn') return;
        set(user ? { user } : { user: null, status: 'signedOut' });
      },
      setIntent: (intent) => set({ intent }),
      setPendingProvider: (pendingProvider) => set({ pendingProvider }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      restartOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'teras.auth',
      version: 1,
      storage: persistStorage,
      partialize: ({ hasCompletedOnboarding }) => ({ hasCompletedOnboarding }),
    },
  ),
);
