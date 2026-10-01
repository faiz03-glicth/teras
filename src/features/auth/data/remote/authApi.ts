import { isAuthApiError, isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';

import { isNetworkError } from '@/core/errors/AppError';

import { AuthError } from '../../domain/AuthError';
import type { AuthUser } from '../../domain/types';
import { mapAuthUser } from '../mapAuthUser';

type SupabaseAuth = SupabaseClient['auth'];

/** Data source: Supabase Auth only. Every method resolves with domain types or rejects with AuthError. */
export interface AuthApi {
  signInWithIdToken(provider: 'apple' | 'google', token: string, nonce?: string): Promise<AuthUser>;
  requestEmailOtp(email: string): Promise<void>;
  verifyEmailOtp(email: string, code: string): Promise<AuthUser>;
  updateFullName(fullName: string): Promise<void>;
  getSessionUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

export function toAuthError(error: unknown, context: 'otp' | 'default' = 'default'): AuthError {
  if (error instanceof AuthError) return error;
  if (isAuthRetryableFetchError(error) || isNetworkError(error)) {
    return new AuthError('Network', 'Network request failed', error);
  }
  if (context === 'otp' && isAuthApiError(error)) {
    if (error.code === 'otp_expired' || error.status === 403) {
      return new AuthError('InvalidOtp', 'Code is wrong or has expired', error);
    }
  }
  return new AuthError('Unknown', 'Authentication failed', error);
}

async function run<T>(call: () => Promise<{ error: unknown } & T>, context?: 'otp' | 'default'): Promise<T> {
  let result: { error: unknown } & T;
  try {
    result = await call();
  } catch (error) {
    throw toAuthError(error, context);
  }
  if (result.error) throw toAuthError(result.error, context);
  return result;
}

export function createAuthApi(auth: SupabaseAuth): AuthApi {
  const userFrom = (data: { user: Parameters<typeof mapAuthUser>[0] | null }): AuthUser => {
    if (!data.user) throw new AuthError('Unknown', 'Supabase returned no user');
    return mapAuthUser(data.user);
  };

  return {
    async signInWithIdToken(provider, token, nonce) {
      const { data } = await run(() => auth.signInWithIdToken({ provider, token, nonce }));
      return userFrom(data);
    },
    async requestEmailOtp(email) {
      await run(() => auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
    },
    async verifyEmailOtp(email, code) {
      const { data } = await run(() => auth.verifyOtp({ email, token: code, type: 'email' }), 'otp');
      return userFrom(data);
    },
    async updateFullName(fullName) {
      await run(() => auth.updateUser({ data: { full_name: fullName } }));
    },
    async getSessionUser() {
      const { data } = await run(() => auth.getSession());
      return data.session ? mapAuthUser(data.session.user) : null;
    },
    async signOut() {
      // 'local' ends this device's session only, not the person's other devices.
      await run(() => auth.signOut({ scope: 'local' }));
    },
    onAuthStateChange(callback) {
      const { data } = auth.onAuthStateChange((event, session) => {
        if (session) callback(mapAuthUser(session.user));
        // Only SIGNED_OUT ends a session. INITIAL_SESSION also arrives empty when an expired token
        // couldn't be refreshed (offline), and the person must stay signed in on their local profile.
        else if (event === 'SIGNED_OUT') callback(null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
