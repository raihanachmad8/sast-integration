'use client';

import { Flex, theme } from 'antd';

import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { TeamsPage } from '@/features/teams';

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
      <PermissionGate permission={PERMISSION.TEAM_VIEW} fallback={<PermissionHint permission={PERMISSION.TEAM_VIEW} />}>
        <TeamsPage />
      </PermissionGate>
    </FeatureGate>
  );
}
