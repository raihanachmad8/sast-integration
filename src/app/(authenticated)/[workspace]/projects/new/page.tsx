'use client';

import { Flex, theme } from 'antd';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { PageHeader } from '@/commons/components/PageHeader';
import { NewProjectPage } from '@/features/projects';

/**
 * Route handler for creating a new project.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link NewProjectPage}.
 *
 * @returns The new project creation page.
 */
export default function Page() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.PROJECTS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="New Project" description="Create a new project to group repositories and scan configurations." />
          <ComingSoonCard
            icon="fa-folder-plus"
            title="Projects"
            description="Projects allow you to group repositories and manage scan configurations."
            envHint="FEATURE_FLAG_PROJECTS"
          />
        </Flex>
      }
    >
      <NewProjectPage />
    </FeatureGate>
  );
}
