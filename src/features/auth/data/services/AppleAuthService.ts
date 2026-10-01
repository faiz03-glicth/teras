import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { errorCode } from '@/core/errors/errorCode';

import { AuthError } from '../../domain/AuthError';

export interface AppleCredential {
  identityToken: string;
  /** Apple only shares the name on the very first sign-in. */
  fullName: string | null;
}

/** Wraps expo-apple-authentication and translates its errors into AuthError. */
export interface AppleAuthService {
  isAvailable(): Promise<boolean>;
  signIn(hashedNonce: string): Promise<AppleCredential>;
}

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (errorCode(error) === 'ERR_REQUEST_CANCELED') return new AuthError('Cancelled');
  return new AuthError('Unknown', 'Apple sign-in failed', error);
}

export const expoAppleAuthService: AppleAuthService = {
  async isAvailable() {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async signIn(hashedNonce) {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new AuthError('Unknown', 'Apple returned no identity token');
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      return { identityToken: credential.identityToken, fullName: name || null };
    } catch (error) {
      throw toAuthError(error);
    }
  },
};
