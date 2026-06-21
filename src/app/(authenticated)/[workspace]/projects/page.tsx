'use client';

import { Flex, theme } from 'antd';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PageHeader } from '@/commons/components/PageHeader';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

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
      <ProjectsPage />
    </FeatureGate>
  );
}
