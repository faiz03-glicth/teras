import { parseEnv } from '../env';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123-web.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123-ios.apps.googleusercontent.com',
  EXPO_PUBLIC_LEGAL_BASE_URL: 'https://teras.example.com/',
};

describe('parseEnv', () => {
  it('accepts a complete env and trims the legal base URL', () => {
    const result = parseEnv(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.env.EXPO_PUBLIC_LEGAL_BASE_URL).toBe('https://teras.example.com');
  });

  it('reports missing and malformed keys by name only', () => {
    const result = parseEnv({
      ...valid,
      EXPO_PUBLIC_SUPABASE_URL: 'not a url',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
    expect(result).toEqual({
      ok: false,
      invalidKeys: expect.arrayContaining(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']),
    });
    expect(JSON.stringify(result)).not.toContain('not a url');
  });

  it('rejects a Google client ID from the wrong domain', () => {
    const result = parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'abc.example.com' });
    expect(result).toEqual({ ok: false, invalidKeys: ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] });
  });
});
