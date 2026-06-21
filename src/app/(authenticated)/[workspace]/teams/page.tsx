'use client';

import { Flex, theme } from 'antd';
import { TeamsPage } from '@/features/teams/TeamsPage';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PageHeader } from '@/commons/components/PageHeader';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

/**
 * Route handler for the Teams list page.
 * Thin wrapper — all logic lives in TeamsPage.
 *
 * @returns The teams management page.
 */
export default function Page() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.TEAMS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Teams" description="Organize members into teams for better access control." />
          <ComingSoonCard
            icon="fa-people-group"
            title="Teams"
            description="Teams allow you to organize members and manage access control."
            envHint="FEATURE_FLAG_TEAMS"
          />
        </Flex>
      }
    >
      <TeamsPage />
    </FeatureGate>
  );
}
