/**
 * Workspace constants shared between client and server.
 * Canonical source — both import from here.
 */
export const WORKSPACE = {
  TYPE: {
    PERSONAL: 'personal',
    ORGANIZATION: 'organization',
  },
  MODE: {
    SINGLE: 'single',
    MULTIPLE: 'multiple',
  },
} as const;
