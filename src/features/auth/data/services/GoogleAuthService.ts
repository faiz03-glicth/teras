import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { AuthError } from '../../domain/AuthError';

/** Wraps @react-native-google-signin/google-signin and translates its errors into AuthError. */
export interface GoogleAuthService {
  configure(clientIds: { webClientId: string; iosClientId: string }): void;
  signIn(): Promise<{ idToken: string }>;
  /** Clears the Google account choice so the next sign-in shows the picker. Never throws. */
  signOut(): Promise<void>;
}

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
      return new AuthError('Cancelled');
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new AuthError('ProviderUnavailable', 'Google Play services unavailable', error);
    }
  }
  return new AuthError('Unknown', 'Google sign-in failed', error);
}

export const googleSignInService: GoogleAuthService = {
  configure({ webClientId, iosClientId }) {
    GoogleSignin.configure({ webClientId, iosClientId, scopes: ['profile', 'email'] });
  },

  async signIn() {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await GoogleSignin.signIn();
      // Since v13, cancelling resolves with { type: 'cancelled' } instead of throwing.
      if (!isSuccessResponse(response)) throw new AuthError('Cancelled');
      const { idToken } = response.data;
      if (!idToken) throw new AuthError('Unknown', 'Google returned no ID token');
      return { idToken };
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Not signed in with Google on this device: nothing to clear.
    }
  },
};
