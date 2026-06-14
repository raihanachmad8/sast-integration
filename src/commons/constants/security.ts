/**
 * Security constants — CSRF headers, rate limits, etc.
 */
export const SECURITY = {
  REFRESH_CSRF_HEADER: 'x-refresh-request',
  REFRESH_CSRF_HEADER_VALUE: '1',
} as const;
