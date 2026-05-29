import { z } from 'zod';
import { NODE_ENV, WORKSPACE_MODE, REGISTRATION_MODE } from '@/server/modules/auth/constants';

const nodeEnvValues = Object.values(NODE_ENV) as [string, ...string[]];
const workspaceModeValues = Object.values(WORKSPACE_MODE) as [string, ...string[]];
const registrationModeValues = Object.values(REGISTRATION_MODE) as [string, ...string[]];

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(nodeEnvValues),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  WORKSPACE_MODE: z.enum(workspaceModeValues).default(WORKSPACE_MODE.MULTIPLE),
  REGISTRATION_MODE: z.enum(registrationModeValues).default(REGISTRATION_MODE.OPEN),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Lazily validated environment variables.
 * Only parsed on first access (runtime), not at import/build time.
 */
export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_env) {
      const result = envSchema.safeParse(process.env);
      if (!result.success) {
        throw new Error(`Invalid environment variables:\n${result.error.format()._errors.join('\n')}`);
      }
      _env = result.data;
    }
    return _env[prop as keyof Env];
  },
});
