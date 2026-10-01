import { AppError } from '@/core/errors/AppError';

/**
 * - Cancelled: the person backed out; the UI stays silent.
 * - ProviderUnavailable: e.g. Google Play services missing.
 * - Network: offline or unreachable.
 * - InvalidOtp: wrong or expired email code.
 * - Unknown: anything else.
 */
export type AuthErrorCode = 'Cancelled' | 'ProviderUnavailable' | 'Network' | 'InvalidOtp' | 'Unknown';

export class AuthError extends AppError<AuthErrorCode> {
  constructor(code: AuthErrorCode, message: string = code, underlying?: unknown) {
    super(code, message, underlying);
    this.name = 'AuthError';
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
