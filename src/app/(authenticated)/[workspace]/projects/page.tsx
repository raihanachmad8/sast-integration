'use client';

import { Flex, theme } from 'antd';

import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { ProjectsPage } from '@/features/projects';

/**
 * Route handler for the Projects list page.
 * Thin wrapper — all logic lives in ProjectsPage.
 *
 * @returns The projects management page.
 */
export default function Page() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.PROJECTS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Projects" description="Manage projects and associate repositories." />
          <ComingSoonCard
            icon="fa-diagram-project"
            title="Projects"
            description="Projects allow you to organize repositories and manage access."
            envHint="FEATURE_FLAG_PROJECTS"
          />
        </Flex>
      }
    >
      <PermissionGate permission={PERMISSION.PROJECT_VIEW} fallback={<PermissionHint permission={PERMISSION.PROJECT_VIEW} />}>
        <ProjectsPage />
      </PermissionGate>
    </FeatureGate>
  );
}
