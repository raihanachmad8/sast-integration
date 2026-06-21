/**
 * Client-side environment configuration.
 * All values are read from NEXT_PUBLIC_* env vars (baked at build time).
 *
 * For feature flags, use the canonical system:
 * @see {@link FeatureGate} component
 * @see {@link useFeatureFlag} hook
 * @see {@link FEATURE_FLAG} constants
 *
 * @example
 * import { clientEnv } from '@/config/client-env';
 *
 * fetch(clientEnv.apiUrl + '/some-endpoint');
 */
export const clientEnv = {
  /** App base URL for canonical links and redirects */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

  /** API base URL for all HTTP requests */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',

  /** Workspace mode: 'single' (invite-only) or 'multiple' (self-signup) */
  workspaceMode: process.env.NEXT_PUBLIC_WORKSPACE_MODE ?? 'multiple',
} as const;
