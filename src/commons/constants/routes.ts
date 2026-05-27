export const ROUTES = {
  AUTH: {
    LOGIN: () => '/login',
    REGISTER: () => '/register',
  },
  WORKSPACE: {
    DASHBOARD: (slug: string) => `/${slug}`,
    PROJECTS: (slug: string) => `/${slug}/projects`,
    FINDINGS: (slug: string) => `/${slug}/findings`,
    REPORTS: (slug: string) => `/${slug}/reports`,
    SETTINGS: (slug: string) => `/${slug}/settings`,
  },
};