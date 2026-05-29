export const ROUTES = {
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNUP: '/auth/signup',
    INVITE: '/auth/invite',
  },
  WORKSPACE: {
    DASHBOARD: (slug: string) => `/${slug}`,
    PROJECTS: (slug: string) => `/${slug}/projects`,
    FINDINGS: (slug: string) => `/${slug}/findings`,
    REPORTS: (slug: string) => `/${slug}/reports`,
    SETTINGS: (slug: string) => `/${slug}/settings`,
  },
} as const;

export const API_BASE = '/api/v1';

export const PUBLIC_PATHS = [
  ROUTES.AUTH.SIGNIN,
  ROUTES.AUTH.SIGNUP,
  ROUTES.AUTH.INVITE,
  '/api/',
] as const;
