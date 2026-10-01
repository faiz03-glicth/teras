import type { AuthUser } from '../domain/types';

/** Single source of truth for who is signed in. Every method rejects with an AuthError. */
export interface AuthRepository {
  /** iOS only; false on Android or devices without Sign in with Apple. */
  isAppleAvailable(): Promise<boolean>;
  signInWithApple(): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;
  requestEmailOtp(email: string): Promise<void>;
  verifyEmailOtp(email: string, code: string): Promise<AuthUser>;
  continueAsGuest(): Promise<AuthUser>;
  restoreSession(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  /** Fires with the signed-in Supabase user, or null when the remote session ends. Returns an unsubscribe. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
