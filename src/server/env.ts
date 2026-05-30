import { z } from 'zod';
import { NODE_ENV, WORKSPACE_MODE } from '@/server/modules/auth/constants';
import { MAIL } from '@/server/modules/mail/constants';

const nodeEnvValues = Object.values(NODE_ENV) as [string, ...string[]];
const workspaceModeValues = Object.values(WORKSPACE_MODE) as [string, ...string[]];
const mailProviderValues = Object.values(MAIL.PROVIDER) as [string, ...string[]];

/** Known dev/example values that must never reach production. */
const INSECURE_SECRETS = ['your-secret-key-minimum-32-characters-long!!', 'changeme', 'secret', 'dev-secret'];

const envSchema = z.object({
  // Core
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(nodeEnvValues),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),
  WORKSPACE_MODE: z.enum(workspaceModeValues).default(WORKSPACE_MODE.MULTIPLE),

  // Mail
  MAIL_PROVIDER: z.enum(mailProviderValues).default(MAIL.PROVIDER.CONSOLE),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@sast.local'),
}).superRefine((data, ctx) => {
  if (data.MAIL_PROVIDER === MAIL.PROVIDER.SMTP && !data.SMTP_HOST) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_HOST is required when MAIL_PROVIDER=smtp', path: ['SMTP_HOST'] });
  }

  // Production hardening: reject dev/placeholder values that must never ship.
  if (data.NODE_ENV === NODE_ENV.PRODUCTION) {
    if (INSECURE_SECRETS.includes(data.JWT_SECRET.toLowerCase())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must not use a default/example value in production', path: ['JWT_SECRET'] });
    }
    if (data.APP_URL.includes('localhost')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must not point to localhost in production', path: ['APP_URL'] });
    }
    if (data.MAIL_PROVIDER === MAIL.PROVIDER.CONSOLE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'console provider is dev-only; configure a real mail provider in production', path: ['MAIL_PROVIDER'] });
    }
  }
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Lazily validated environment variables.
 * Only parsed on first access (runtime), not at import/build time.
 * All config in one schema — mail fields conditionally required.
 */
export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_env) {
      const result = envSchema.safeParse(process.env);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment variables:\n${issues}`);
      }
      _env = result.data;
    }
    return _env[prop as keyof Env];
  },
});
