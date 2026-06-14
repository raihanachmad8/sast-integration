export const ROUTES = {
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNUP: '/auth/signup',
    INVITE: '/auth/invite',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  DOCS: {
    INDEX: '/docs',
    GETTING_STARTED: '/docs/getting-started',
    ARCHITECTURE: '/docs/architecture',
    SCANNING: '/docs/scanning',
    AI_VERIFICATION: '/docs/ai-verification',
    API_REFERENCE: '/docs/api-reference',
  },
  CHOOSER: '/workspaces',
  WORKSPACE: {
    DASHBOARD: (slug: string) => `/${slug}`,
    REPOSITORIES: (slug: string) => `/${slug}/repositories`,
    SCANS: (slug: string) => `/${slug}/scan`,
    FINDINGS: (slug: string) => `/${slug}/findings`,
    REPORTS: (slug: string) => `/${slug}/reports`,
    ARENA: (slug: string) => `/${slug}/arena`,
    MEMBERS: (slug: string) => `/${slug}/members`,
    TEAMS: (slug: string) => `/${slug}/teams`,
    PROJECTS: (slug: string) => `/${slug}/projects`,
    SCHEDULES: (slug: string) => `/${slug}/schedules`,
    PROFILE: (slug: string) => `/${slug}/profile`,
    SECURITY: (slug: string) => `/${slug}/security`,
    SOURCE_CONTROL: (slug: string) => `/${slug}/source-control`,
    WEBHOOKS: (slug: string) => `/${slug}/webhooks`,
    SCANNER_ENGINES: (slug: string) => `/${slug}/scanner-engines`,
    AI_MODELS: (slug: string) => `/${slug}/ai-models`,
    QUALITY_GATES: (slug: string) => `/${slug}/quality-gates`,
    KNOWLEDGE_BASE: (slug: string) => `/${slug}/knowledge-base`,
    SETTINGS: (slug: string) => `/${slug}/settings`,
  },
} as const;

export const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1')
  : '/api/v1';

export const PUBLIC_PATHS = [
  ROUTES.AUTH.SIGNIN,
  ROUTES.AUTH.SIGNUP,
  ROUTES.AUTH.INVITE,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
  ROUTES.AUTH.VERIFY_EMAIL,
  ROUTES.DOCS.INDEX,
  '/docs/',
  '/api/',
] as const;
