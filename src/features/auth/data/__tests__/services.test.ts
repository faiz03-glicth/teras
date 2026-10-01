import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { expoAppleAuthService } from '../services/AppleAuthService';
import { googleSignInService } from '../services/GoogleAuthService';

jest.mock('@react-native-google-signin/google-signin', () => {
  const statusCodes = {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  };
  return {
    statusCodes,
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    isSuccessResponse: (response: { type: string }) => response.type === 'success',
    isErrorWithCode: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
  };
});

const coded = (code: string) => Object.assign(new Error(code), { code });
const google = jest.mocked(GoogleSignin);
const apple = jest.mocked(AppleAuthentication);

afterEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('GoogleAuthService', () => {
  it('returns the ID token on success', async () => {
    google.signIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'tok' } } as never);
    await expect(googleSignInService.signIn()).resolves.toEqual({ idToken: 'tok' });
  });

  it('maps a cancelled response and cancel/in-progress errors to Cancelled', async () => {
    google.signIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
    await expect(googleSignInService.signIn()).rejects.toMatchObject({ code: 'Cancelled' });
    google.signIn.mockRejectedValueOnce(coded(statusCodes.SIGN_IN_CANCELLED));
    await expect(googleSignInService.signIn()).rejects.toMatchObject({ code: 'Cancelled' });
    google.signIn.mockRejectedValueOnce(coded(statusCodes.IN_PROGRESS));
    await expect(googleSignInService.signIn()).rejects.toMatchObject({ code: 'Cancelled' });
  });

  it('checks Play services on Android and maps their absence to ProviderUnavailable', async () => {
    Platform.OS = 'android';
    google.hasPlayServices.mockRejectedValueOnce(coded(statusCodes.PLAY_SERVICES_NOT_AVAILABLE));
    await expect(googleSignInService.signIn()).rejects.toMatchObject({ code: 'ProviderUnavailable' });
    expect(google.signIn).not.toHaveBeenCalled();
  });

  it('configures the client IDs with profile and email scopes', () => {
    googleSignInService.configure({ webClientId: 'web', iosClientId: 'ios' });
    expect(google.configure).toHaveBeenCalledWith({
      webClientId: 'web',
      iosClientId: 'ios',
      scopes: ['profile', 'email'],
    });
  });
});

describe('AppleAuthService', () => {
  it('passes the hashed nonce and joins the first-time name', async () => {
    apple.signInAsync.mockResolvedValueOnce({
      identityToken: 'id',
      fullName: { givenName: 'Faiz', familyName: 'Ahmad' },
    } as never);
    await expect(expoAppleAuthService.signIn('hashed')).resolves.toEqual({
      identityToken: 'id',
      fullName: 'Faiz Ahmad',
    });
    expect(apple.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'hashed' }));
  });

  it('maps ERR_REQUEST_CANCELED to Cancelled', async () => {
    apple.signInAsync.mockRejectedValueOnce(coded('ERR_REQUEST_CANCELED'));
    await expect(expoAppleAuthService.signIn('hashed')).rejects.toMatchObject({ code: 'Cancelled' });
  });

  it('is never available on Android', async () => {
    Platform.OS = 'android';
    await expect(expoAppleAuthService.isAvailable()).resolves.toBe(false);
  });
});
