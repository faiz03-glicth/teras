import { z } from 'zod';

const googleClientId = z
  .string()
  .regex(/^[\w-]+\.apps\.googleusercontent\.com$/, 'must be a Google OAuth client ID');

/**
 * EXPO_PUBLIC_* values are built into the app, where anyone can read them, so a Supabase key here must be
 * the public one. A secret (`sb_secret_…`) or legacy `service_role` key would bypass Row Level Security for
 * everyone (security review L1): refuse to start with one.
 */
export function isPublicSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return false;
  const payload = key.split('.')[1];
  if (key.split('.').length !== 3 || !payload) return true;
  try {
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return !(
      typeof claims === 'object' &&
      claims !== null &&
      'role' in claims &&
      claims.role === 'service_role'
    );
  } catch {
    return true;
  }
}

const publicSupabaseKey = z.string().min(1).refine(isPublicSupabaseKey, 'must be a publishable (anon) key');

const envSchema = z
  .object({
    EXPO_PUBLIC_SUPABASE_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: publicSupabaseKey,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleClientId,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleClientId,
    EXPO_PUBLIC_LEGAL_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
    // The teras-detail project (decision 22). Optional: without both, workout detail stays on the phone.
    // The project URL; a pasted REST URL (…/rest/v1/) is trimmed back to it.
    EXPO_PUBLIC_TERAS_DETAIL_URL: z
      .url()
      .transform((url) => url.replace(/\/+$/, '').replace(/\/rest\/v1$/, ''))
      .optional(),
    EXPO_PUBLIC_TERAS_DETAIL_KEY: publicSupabaseKey.optional(),
  })
  .refine(
    (env) =>
      (env.EXPO_PUBLIC_TERAS_DETAIL_URL === undefined) === (env.EXPO_PUBLIC_TERAS_DETAIL_KEY === undefined),
    { message: 'set both or neither', path: ['EXPO_PUBLIC_TERAS_DETAIL_KEY'] },
  );

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; invalidKeys: string[] };

/** Pure: validates a raw env object. Reports key names only, never values. */
export function parseEnv(raw: Record<string, string | undefined>): EnvResult {
  const result = envSchema.safeParse(raw);
  if (result.success) return { ok: true, env: result.data };
  const invalidKeys = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  return { ok: false, invalidKeys };
}

// EXPO_PUBLIC_* values are inlined at build time, so each must be read statically.
export const envResult: EnvResult = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_LEGAL_BASE_URL: process.env.EXPO_PUBLIC_LEGAL_BASE_URL,
  EXPO_PUBLIC_TERAS_DETAIL_URL: process.env.EXPO_PUBLIC_TERAS_DETAIL_URL || undefined,
  EXPO_PUBLIC_TERAS_DETAIL_KEY: process.env.EXPO_PUBLIC_TERAS_DETAIL_KEY || undefined,
});

/** Returns the validated env or throws. The boot gate checks `envResult` first and shows a readable error. */
export function requireEnv(): Env {
  if (!envResult.ok) {
    throw new Error(`Invalid environment variables: ${envResult.invalidKeys.join(', ')}`);
  }
  return envResult.env;
}
