import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/core/db/schema/index.ts',
  out: './src/core/db/migrations',
} satisfies Config;
