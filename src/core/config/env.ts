import { z } from 'zod';

const googleClientId = z
  .string()
  .regex(/^[\w-]+\.apps\.googleusercontent\.com$/, 'must be a Google OAuth client ID');

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleClientId,
  EXPO_PUBLIC_LEGAL_BASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
});

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
});

/** Returns the validated env or throws. The boot gate checks `envResult` first and shows a readable error. */
export function requireEnv(): Env {
  if (!envResult.ok) {
    throw new Error(`Invalid environment variables: ${envResult.invalidKeys.join(', ')}`);
  }
  return envResult.env;
}
