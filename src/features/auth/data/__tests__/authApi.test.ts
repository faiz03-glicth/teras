import { AuthApiError, AuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';

import { createAuthApi, toAuthError } from '../remote/authApi';

const supabaseUser = {
  id: 'user-1',
  email: 'person@example.com',
  app_metadata: { provider: 'google' },
  user_metadata: { full_name: 'Faiz Ahmad', avatar_url: 'https://img/a.png' },
};

function fakeAuth(overrides: Record<string, jest.Mock>) {
  return overrides as unknown as SupabaseClient['auth'];
}

describe('toAuthError', () => {
  it('maps fetch failures to Network and OTP rejections to InvalidOtp', () => {
    expect(toAuthError(new AuthRetryableFetchError('fetch failed', 0)).code).toBe('Network');
    expect(toAuthError(new TypeError('Network request failed')).code).toBe('Network');
    expect(
      toAuthError(new AuthApiError('Token has expired or is invalid', 403, 'otp_expired'), 'otp').code,
    ).toBe('InvalidOtp');
    expect(toAuthError(new AuthApiError('Token has expired or is invalid', 403, 'otp_expired')).code).toBe(
      'Unknown',
    );
  });
});

describe('createAuthApi', () => {
  it('maps the Supabase user on sign-in', async () => {
    const signInWithIdToken = jest.fn(async () => ({
      data: { user: supabaseUser, session: {} },
      error: null,
    }));
    const api = createAuthApi(fakeAuth({ signInWithIdToken }));
    await expect(api.signInWithIdToken('google', 'tok')).resolves.toEqual({
      id: 'user-1',
      email: 'person@example.com',
      displayName: 'Faiz Ahmad',
      avatarUrl: 'https://img/a.png',
      provider: 'google',
    });
    expect(signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'tok', nonce: undefined });
  });

  it('turns returned errors into AuthErrors', async () => {
    const verifyOtp = jest.fn(async () => ({
      data: { user: null, session: null },
      error: new AuthApiError('Token has expired or is invalid', 403, 'otp_expired'),
    }));
    const signInWithOtp = jest.fn(async () => ({
      data: {},
      error: new AuthRetryableFetchError('Network request failed', 0),
    }));
    const api = createAuthApi(fakeAuth({ verifyOtp, signInWithOtp }));
    await expect(api.verifyEmailOtp('a@b.co', '000000')).rejects.toMatchObject({ code: 'InvalidOtp' });
    await expect(api.requestEmailOtp('a@b.co')).rejects.toMatchObject({ code: 'Network' });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: 'a@b.co', options: { shouldCreateUser: true } });
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: '000000', type: 'email' });
  });

  it('reports a sign-out only for SIGNED_OUT, never for an empty session after a failed refresh', () => {
    let emit: (event: string, session: { user: typeof supabaseUser } | null) => void = () => undefined;
    const onAuthStateChange = jest.fn((listener: typeof emit) => {
      emit = listener;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    const callback = jest.fn();
    createAuthApi(fakeAuth({ onAuthStateChange })).onAuthStateChange(callback);

    emit('INITIAL_SESSION', null);
    expect(callback).not.toHaveBeenCalled();
    emit('TOKEN_REFRESHED', { user: supabaseUser });
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'user-1' }));
    emit('SIGNED_OUT', null);
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('signs out this device only', async () => {
    const signOut = jest.fn(async () => ({ error: null }));
    await createAuthApi(fakeAuth({ signOut })).signOut();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
