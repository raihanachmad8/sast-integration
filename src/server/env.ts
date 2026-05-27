import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  JWT_SECRET: z.string(),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

function getEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (e) {
    console.error('Invalid environment variables:', e);
    process.exit(1);
  }
}

export const env = getEnv();