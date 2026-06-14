'use client';

import { Typography, Flex, theme } from 'antd';
import { useProjectQuery } from '@/modules/projects';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectForm, ProjectApiTokens } from '@/features/projects';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { errorMessage } from '@/lib/api/errors';

export function EditProjectPage({ projectId }: { projectId: string }) {
  const { token } = theme.useToken();
  const projectQuery = useProjectQuery(projectId);
  const project = projectQuery.data ?? null;

  if (projectQuery.isLoading) {
    return <LoadingState text="Loading project..." />;
  }

  if (projectQuery.isError) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Edit project" description="Failed to load project." />
        <ErrorState title="Failed to load project" description={errorMessage(projectQuery.error)} onRetry={() => projectQuery.refetch()} />
      </Flex>
    );
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingXL }}>
        <Typography.Title level={2} style={{ fontWeight: 700 }}>Project not found</Typography.Title>
        <Typography.Paragraph type="secondary">The project you are looking for does not exist.</Typography.Paragraph>
      </div>
    );
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Edit project" description={`Update project details and settings for ${project.name}.`} />
      <ProjectForm project={project} />

      <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingXL * 2 }}>
        <ProjectApiTokens projectId={projectId} />
      </div>
    </Flex>
  );
}
