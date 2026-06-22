'use client';

import { Flex, theme } from 'antd';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { PageHeader } from '@/commons/components/PageHeader';
import { NewTeamPage } from '@/features/teams/NewTeamPage';

/**
 * Route handler for creating a new team.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link NewTeamPage}.
 *
 * @returns The new team creation page.
 */
export default function Page() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.TEAMS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="New Team" description="Create a new team to organize members and manage access." />
          <ComingSoonCard
            icon="fa-users"
            title="Teams"
            description="Teams allow you to organize members and manage access control."
            envHint="FEATURE_FLAG_TEAMS"
          />
        </Flex>
      }
    >
      <NewTeamPage />
    </FeatureGate>
  );
}
