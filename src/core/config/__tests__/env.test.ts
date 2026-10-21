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

  it('refuses a secret or service_role key, which would bypass Row Level Security', () => {
    const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;

    expect(parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toEqual({
      ok: false,
      invalidKeys: ['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
    });
    expect(parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') }).ok).toBe(false);
    expect(parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('anon') }).ok).toBe(true);
    expect(parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_abc' }).ok).toBe(true);
  });

  it('takes the teras-detail URL and key together or not at all, and only a public key', () => {
    const detail = {
      EXPO_PUBLIC_TERAS_DETAIL_URL: 'https://def.supabase.co',
      EXPO_PUBLIC_TERAS_DETAIL_KEY: 'sb_publishable_x',
    };

    expect(parseEnv({ ...valid, ...detail }).ok).toBe(true);
    const pasted = parseEnv({
      ...valid,
      ...detail,
      EXPO_PUBLIC_TERAS_DETAIL_URL: 'https://def.supabase.co/rest/v1/',
    });
    expect(pasted.ok && pasted.env.EXPO_PUBLIC_TERAS_DETAIL_URL).toBe('https://def.supabase.co');
    expect(parseEnv({ ...valid, EXPO_PUBLIC_TERAS_DETAIL_URL: detail.EXPO_PUBLIC_TERAS_DETAIL_URL }).ok).toBe(
      false,
    );
    expect(parseEnv({ ...valid, ...detail, EXPO_PUBLIC_TERAS_DETAIL_KEY: 'sb_secret_x' }).ok).toBe(false);
  });
});
