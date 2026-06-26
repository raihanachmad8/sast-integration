'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag, useFeatureFlags } from '@/lib/hooks/useFeatureFlag';
import type { FeatureFlagKey } from '@/commons/constants/feature-flags';

interface FeatureGateProps {
  /** Single feature flag to check */
  flag?: FeatureFlagKey;
  /** Multiple feature flags — renders children if ANY flag is enabled (OR logic) */
  anyFlags?: FeatureFlagKey[];
  /** Content to render when flag(s) are enabled */
  children: ReactNode;
  /** Content to render when flag(s) are disabled (default: null) */
  fallback?: ReactNode;
}

/**
 * Conditional rendering gate based on feature flag state.
 *
 * Supports two modes:
 * - `flag` — single flag check (backward compatible)
 * - `anyFlags` — multi-flag OR check (renders children if ANY flag is enabled)
 *
 * @param props - {@link FeatureGateProps}
 * @returns JSX element containing children if flag(s) enabled, otherwise fallback.
 *
 * @example
 * // Single flag
 * <FeatureGate flag={FEATURE_FLAG.TEAMS}>
 *   <TeamsPage />
 * </FeatureGate>
 *
 * @example
 * // Multi-flag OR
 * <FeatureGate anyFlags={[FEATURE_FLAG.SCM_GITHUB, FEATURE_FLAG.SCM_GITLAB]}>
 *   <SourceControlPage />
 * </FeatureGate>
 *
 * @example
 * // With fallback
 * <FeatureGate flag={FEATURE_FLAG.ARENA} fallback={<ComingSoon />}>
 *   <ArenaPage />
 * </FeatureGate>
 */
export function FeatureGate({ flag, anyFlags, children, fallback = null }: FeatureGateProps) {
  const singleResult = useFeatureFlag(flag ?? '' as FeatureFlagKey);
  const multiResult = useFeatureFlags(anyFlags ?? []);

  let enabled = true;
  if (flag) {
    enabled = singleResult.enabled;
  } else if (anyFlags && anyFlags.length > 0) {
    enabled = anyFlags.some((f) => multiResult.flags[f]);
  }

  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}
