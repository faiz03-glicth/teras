import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { profileQueryKey } from '@/features/profile/hooks/useProfile';

import type { AuthProvider, AuthUser } from '../domain/types';
import { useAuthStore } from '../state/authStore';

/** One mutation per sign-in method. Never retried: each attempt is an explicit tap. */
export function useAuthMutations() {
  const { auth } = useRepositories();
  const queryClient = useQueryClient();
  const setPendingProvider = useAuthStore((s) => s.setPendingProvider);
  const setUser = useAuthStore((s) => s.setUser);

  const pending = (provider: AuthProvider) => ({
    retry: false as const,
    onMutate: () => setPendingProvider(provider),
    onSettled: () => setPendingProvider(null),
  });
  const signIn = (provider: AuthProvider) => ({
    ...pending(provider),
    onSuccess: (user: AuthUser) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
    },
  });

  return {
    apple: useMutation({ mutationFn: () => auth.signInWithApple(), ...signIn('apple') }),
    google: useMutation({ mutationFn: () => auth.signInWithGoogle(), ...signIn('google') }),
    requestOtp: useMutation({
      mutationFn: (email: string) => auth.requestEmailOtp(email),
      ...pending('email'),
    }),
    verifyOtp: useMutation({
      mutationFn: ({ email, code }: { email: string; code: string }) => auth.verifyEmailOtp(email, code),
      ...signIn('email'),
    }),
    guest: useMutation({ mutationFn: () => auth.continueAsGuest(), ...signIn('guest') }),
  };
}
