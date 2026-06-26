'use client';

import { use } from 'react';
import { Flex, theme } from 'antd';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { PageHeader } from '@/commons/components/PageHeader';
import { ProjectDetailPage } from '@/features/projects';

/**
 * Route handler for viewing project details.
 * Thin wrapper — extracts `projectId` from dynamic route params and passes
 * it to {@link ProjectDetailPage}.
 *
 * @param params - Next.js dynamic route params containing `projectId`.
 * @returns The project detail page.
 */
export default function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.PROJECTS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Project" description="View project details and repository scans." />
          <ComingSoonCard
            icon="fa-folder-open"
            title="Projects"
            description="Projects allow you to group repositories and manage scan configurations."
            envHint="FEATURE_FLAG_PROJECTS"
          />
        </Flex>
      }
    >
      <ProjectDetailPage projectId={projectId} />
    </FeatureGate>
  );
}
