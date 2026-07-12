'use client';

import { FEATURE_FLAG, FEATURE_FLAG_DEFAULTS, type FeatureFlagKey } from '@/commons/constants/feature-flags';

/**
 * Client-side feature flag resolution.
 *
 * Since env vars are baked in at build time for the client,
 * we use the defaults as the source of truth on the client.
 * Server-side can override via API response headers if needed.
 *
 * **Invariant:** This module is client-only. The module-level cache
 * (`_clientFlags`) must never be populated during SSR to avoid
 * stale data leaking across requests in edge/serverless runtimes.
 */

// Static mapping: Next.js can only inline process.env.NEXT_PUBLIC_*
// when the key is a literal — dynamic access (process.env[variable])
// is NOT inlined and returns undefined on the client.
const CLIENT_ENV_OVERRIDES: Partial<Record<FeatureFlagKey, string | undefined>> = {
  [FEATURE_FLAG.SCAN_MANAGED]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCAN_MANAGED,
  [FEATURE_FLAG.SCAN_EXTERNAL_UPLOAD]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD,
  [FEATURE_FLAG.AI_VERIFICATION]: process.env.NEXT_PUBLIC_FEATURE_FLAG_AI_VERIFICATION,
  [FEATURE_FLAG.QUALITY_GATES]: process.env.NEXT_PUBLIC_FEATURE_FLAG_QUALITY_GATES,
  [FEATURE_FLAG.TEAMS]: process.env.NEXT_PUBLIC_FEATURE_FLAG_TEAMS,
  [FEATURE_FLAG.PROJECTS]: process.env.NEXT_PUBLIC_FEATURE_FLAG_PROJECTS,
  [FEATURE_FLAG.KNOWLEDGE_BASE]: process.env.NEXT_PUBLIC_FEATURE_FLAG_KNOWLEDGE_BASE,
  [FEATURE_FLAG.SCHEDULES]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCHEDULES,
  [FEATURE_FLAG.SOURCE_CONTROL_GITHUB]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITHUB,
  [FEATURE_FLAG.SOURCE_CONTROL_GITLAB]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITLAB,
  [FEATURE_FLAG.SOURCE_CONTROL_GITEA]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITEA,
  [FEATURE_FLAG.WEBHOOKS]: process.env.NEXT_PUBLIC_FEATURE_FLAG_WEBHOOKS,
  [FEATURE_FLAG.SCAN_PROFILES]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCAN_PROFILES,
  [FEATURE_FLAG.SCANNER_ENGINES]: process.env.NEXT_PUBLIC_FEATURE_FLAG_SCANNER_ENGINES,
  [FEATURE_FLAG.AI_MODELS]: process.env.NEXT_PUBLIC_FEATURE_FLAG_AI_MODELS,
  [FEATURE_FLAG.REPORTS]: process.env.NEXT_PUBLIC_FEATURE_FLAG_REPORTS,
  [FEATURE_FLAG.ARENA]: process.env.NEXT_PUBLIC_FEATURE_FLAG_ARENA,
};

// Client-side flags are resolved from NEXT_PUBLIC_* env vars
// or fall back to defaults
function getClientFlags(): Record<FeatureFlagKey, boolean> {
  if (typeof window === 'undefined') return FEATURE_FLAG_DEFAULTS;

  const result = { ...FEATURE_FLAG_DEFAULTS };

  for (const [flag, envValue] of Object.entries(CLIENT_ENV_OVERRIDES) as [FeatureFlagKey, string | undefined][]) {
    if (envValue !== undefined) {
      result[flag] = envValue === 'true' || envValue === '1';
    }
  }

  return result;
}

/**
 * Cached client flags.
 * Only populated on first client-side call. Safe because env vars
 * are build-time constants and never change within a session.
 */
let _clientFlags: Record<FeatureFlagKey, boolean> | null = null;

function getClientFlagsCached(): Record<FeatureFlagKey, boolean> {
  if (!_clientFlags) {
    _clientFlags = getClientFlags();
  }
  return _clientFlags;
}

/**
 * Hook to check if a feature flag is enabled.
 *
 * @param flag - Feature flag key to check
 * @returns Whether the flag is enabled
 *
 * @example
 * const { enabled } = useFeatureFlag(FEATURE_FLAG.TEAMS);
 * if (enabled) { /* show teams feature *\/ }
 */
export function useFeatureFlag(flag: FeatureFlagKey) {
  const flags = getClientFlagsCached();
  return {
    enabled: flags[flag] ?? false,
    isLoading: false,
  };
}

/**
 * Hook to check multiple feature flags at once.
 *
 * @param flags - Array of feature flag keys to check
 * @returns Map of flag keys to enabled states
 *
 * @example
 * const { flags } = useFeatureFlags([FEATURE_FLAG.TEAMS, FEATURE_FLAG.PROJECTS]);
 * if (flags[FEATURE_FLAG.TEAMS]) { /* show teams *\/ }
 */
export function useFeatureFlags(flags: FeatureFlagKey[]) {
  const allFlags = getClientFlagsCached();
  const result = {} as Record<FeatureFlagKey, boolean>;
  for (const flag of flags) {
    result[flag] = allFlags[flag] ?? false;
  }
  return { flags: result, isLoading: false };
}
