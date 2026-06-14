/** Default bootstrap owner credentials (dev only; production requires explicit env). */
export const OWNER_DEFAULTS = {
  EMAIL: 'owner@sast.local',
  PASSWORD: 'ChangeMe123!',
  NAME: 'Owner',
} as const;

/** Default organization workspace seeded in single mode. */
export const ORG_DEFAULTS = {
  NAME: 'SAST Organization',
  SLUG: 'sast-org',
} as const;
