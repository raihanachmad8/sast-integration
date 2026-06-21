'use client';

import { use } from 'react';
import { Flex, theme } from 'antd';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { PageHeader } from '@/commons/components/PageHeader';
import { EditTeamPage } from '@/features/teams/EditTeamPage';

/**
 * Route handler for editing an existing team.
 *
 * @remarks
 * Thin wrapper — extracts `teamId` from dynamic route params and passes
 * it to {@link EditTeamPage}.
 *
 * @param params - Next.js dynamic route params containing `teamId`.
 * @returns The team edit page.
 */
export default function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.TEAMS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Edit Team" description="Edit team settings and member access." />
          <ComingSoonCard
            icon="fa-users-gear"
            title="Teams"
            description="Teams allow you to organize members and manage access control."
            envHint="FEATURE_FLAG_TEAMS"
          />
        </Flex>
      }
    >
      <EditTeamPage teamId={teamId} />
    </FeatureGate>
  );
}
