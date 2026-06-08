/**
 * Client-side environment configuration.
 * All values are read from NEXT_PUBLIC_* env vars (baked at build time).
 *
 * @example
 * import { clientEnv } from '@/config/client-env';
 *
 * if (clientEnv.mockData) { ... }
 * if (clientEnv.features.teams) { ... }
 */
export const clientEnv = {
  /** Use mock data instead of real API */
  mockData: process.env.NEXT_PUBLIC_MOCK_DATA === 'true',

  /** App base URL for canonical links and redirects */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

  /** API base URL for all HTTP requests */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',

  /** Workspace mode: 'single' (invite-only) or 'multiple' (self-signup) */
  workspaceMode: process.env.NEXT_PUBLIC_WORKSPACE_MODE ?? 'multiple',

  /** Feature flags — client-side gating for conditional rendering */
  features: {
    scanManaged: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCAN_MANAGED === 'true',
    aiVerification: process.env.NEXT_PUBLIC_FEATURE_FLAG_AI_VERIFICATION === 'true',
    teams: process.env.NEXT_PUBLIC_FEATURE_FLAG_TEAMS === 'true',
    projects: process.env.NEXT_PUBLIC_FEATURE_FLAG_PROJECTS === 'true',
    sourceControlGithub: process.env.NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITHUB === 'true',
    webhooks: process.env.NEXT_PUBLIC_FEATURE_FLAG_WEBHOOKS === 'true',
    reports: process.env.NEXT_PUBLIC_FEATURE_FLAG_REPORTS === 'true',
  },
} as const;
