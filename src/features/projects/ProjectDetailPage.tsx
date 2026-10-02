'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Flex, Typography, Tabs, Tag, Descriptions, Statistic, theme } from 'antd';
import { useProjectQuery, useDeleteProjectMutation } from '@/modules/project';
import { useSessionQuery } from '@/modules/auth/queries';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectApiTokens } from '@/features/projects';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { errorMessage } from '@/lib/api/errors';
import { FaIcon } from '@/components/shared/fa-icon';
import { formatDate } from '@/lib/utils/formatDate';
import { toProjectRefName } from '@/commons/types';

interface ProjectDetailPageProps {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const projectQuery = useProjectQuery(workspaceId, projectId);
  const project = projectQuery.data ?? null;
  const deleteMutation = useDeleteProjectMutation(workspaceId);
  const [activeTab, setActiveTab] = useState('overview');

  if (projectQuery.isLoading) {
    return <LoadingState text="Loading project..." />;
  }

  if (projectQuery.isError) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Project" description="Failed to load project." />
        <ErrorState title="Failed to load project" description={errorMessage(projectQuery.error)} onRetry={() => projectQuery.refetch()} />
      </Flex>
    );
  }

  if (!project) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Project" description="Project not found." />
        <ErrorState title="Project not found" description="The project you're looking for doesn't exist." />
      </Flex>
    );
  }

  const handleDelete = () => {
    modal.confirm({
      title: 'Delete project?',
      content: `Delete "${project.name}"? This cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(projectId, {
          onSuccess: () => {
            message.success(`Project "${project.name}" deleted`);
            router.push(`/${workspaceSlug}/projects`);
          },
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span><FaIcon icon="fa-info-circle" style={{ marginRight: 8 }} /> Overview</span>
      ),
      children: (
        <Flex vertical gap={token.paddingXL}>
          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
              <Descriptions.Item label="Name">
                <Typography.Text strong>{project.name}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Lead">
                {project.lead || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDate(project.createdAt ?? '')}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={3}>
                {project.description || 'No description provided.'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: token.marginMD }}>
            <Card styles={{ body: { padding: token.paddingLG } }}>
              <Statistic title="Repositories" value={(project.repositories ?? []).length} prefix={<FaIcon icon="fa-code-branch" style={{ color: token.colorPrimary }} />} />
            </Card>
            <Card styles={{ body: { padding: token.paddingLG } }}>
              <Statistic title="Teams" value={(project.teams ?? []).length} prefix={<FaIcon icon="fa-people-group" style={{ color: token.colorSuccess }} />} />
            </Card>
            <Card styles={{ body: { padding: token.paddingLG } }}>
              <Statistic title="Members" value={(project.members ?? []).length} prefix={<FaIcon icon="fa-users" style={{ color: token.colorInfo }} />} />
            </Card>
            <Card styles={{ body: { padding: token.paddingLG } }}>
            </Card>
          </div>

          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: token.marginMD }}>Repositories</Typography.Title>
            {(project.repositories ?? []).length > 0 ? (
              <Flex wrap="wrap" gap={token.paddingXS}>
                {project.repositories.map((r) => <Tag key={toProjectRefName(r)}>{toProjectRefName(r)}</Tag>)}
              </Flex>
            ) : (
              <Typography.Text type="secondary">No repositories attached.</Typography.Text>
            )}
          </Card>

          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: token.marginMD }}>Teams</Typography.Title>
            {(project.teams ?? []).length > 0 ? (
              <Flex wrap="wrap" gap={token.paddingXS}>
                {project.teams.map((t) => <Tag key={toProjectRefName(t)} color="teal">{toProjectRefName(t)}</Tag>)}
              </Flex>
            ) : (
              <Typography.Text type="secondary">No teams assigned.</Typography.Text>
            )}
          </Card>

          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: token.marginMD }}>Members</Typography.Title>
            {(project.members ?? []).length > 0 ? (
              <Flex wrap="wrap" gap={token.paddingXS}>
                {project.members.map((m) => <Tag key={toProjectRefName(m)}>{toProjectRefName(m)}</Tag>)}
              </Flex>
            ) : (
              <Typography.Text type="secondary">No direct members.</Typography.Text>
            )}
          </Card>
        </Flex>
      ),
    },
    {
      key: 'api-tokens',
      label: (
        <span><FaIcon icon="fa-key" style={{ marginRight: 8 }} /> API Tokens</span>
      ),
      children: (
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <ProjectApiTokens workspaceId={workspaceId} projectId={projectId} />
        </Card>
      ),
    },
  ];

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title={project.name}
        description="Project details and settings."
        breadcrumbs={[
          { label: 'Projects', href: `/${workspaceSlug}/projects` },
          { label: project.name },
        ]}
        actions={
          <Flex gap={token.marginSM}>
            <Button onClick={() => router.push(`/${workspaceSlug}/projects/${projectId}/edit`)}>
              <FaIcon icon="fa-pen" /> Edit
            </Button>
            <Button danger onClick={handleDelete}>
              <FaIcon icon="fa-trash" /> Delete
            </Button>
          </Flex>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Flex>
  );
}
