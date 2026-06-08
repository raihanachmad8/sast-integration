'use client';

import { FEATURE_FLAG_DEFAULTS, type FeatureFlagKey } from '@/commons/constants/feature-flags';

/**
 * Client-side feature flag resolution.
 *
 * Since env vars are baked in at build time for the client,
 * we use the defaults as the source of truth on the client.
 * Server-side can override via API response headers if needed.
 */

// Client-side flags are resolved from NEXT_PUBLIC_* env vars
// or fall back to defaults
function getClientFlags(): Record<FeatureFlagKey, boolean> {
  if (typeof window === 'undefined') return FEATURE_FLAG_DEFAULTS;

  const result = { ...FEATURE_FLAG_DEFAULTS };

  // Check for NEXT_PUBLIC Feature Flag env vars
  const allFlags = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];
  for (const flag of allFlags) {
    const envKey = `NEXT_PUBLIC_FEATURE_${flag.replace(/\./g, '_').toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      result[flag] = envValue === 'true' || envValue === '1';
    }
  }

  return result;
}

/** Cached client flags */
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
