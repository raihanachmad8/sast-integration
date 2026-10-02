export const APP_NAME = 'SAST Integration';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'Static Application Security Testing Integration Platform';

/** Security-related constants safe for client usage */
export const SECURITY = {
  /** Header required when calling the refresh endpoint (CSRF protection) */
  REFRESH_CSRF_HEADER: 'x-refresh-request',
  REFRESH_CSRF_HEADER_VALUE: '1',
} as const;