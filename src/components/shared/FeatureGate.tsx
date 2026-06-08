'use client';

import type { ReactNode } from 'react';
import { Skeleton, theme } from 'antd';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import type { FeatureFlagKey } from '@/commons/constants/feature-flags';

interface FeatureGateProps {
  /** Feature flag to check */
  flag: FeatureFlagKey;
  /** Content to render when flag is enabled */
  children: ReactNode;
  /** Content to render when flag is disabled (default: null) */
  fallback?: ReactNode;
}

/**
 * Conditional rendering gate based on feature flag state.
 *
 * Renders children only if the specified feature flag is enabled
 * for the current workspace. Otherwise renders the fallback.
 * Shows a skeleton loader while the flag state is loading.
 *
 * @param props - {@link FeatureGateProps}
 * @returns JSX element containing children if flag is enabled, otherwise fallback.
 *
 * @example
 * <FeatureGate flag={FEATURE_FLAG.TEAMS}>
 *   <TeamsPage />
 * </FeatureGate>
 *
 * @example
 * <FeatureGate flag={FEATURE_FLAG.ARENA} fallback={<ComingSoon />}>
 *   <ArenaPage />
 * </FeatureGate>
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const { token } = theme.useToken();
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading) {
    return (
      <div style={{ padding: token.paddingLG }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }
  if (!enabled) return <>{fallback}</>;

  return <>{children}</>;
}
