'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Button, Card, Flex, Form, Input, Select, Typography, Tabs, Descriptions, Statistic, theme } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useProjectQuery, useUpdateProjectMutation, useDeleteProjectMutation } from '@/modules/projects';
import { useSessionData } from '@/modules/auth/queries';
import { useTeamsQuery } from '@/modules/teams';
import { useMembersQuery } from '@/modules/members';
import { useRepositoriesQuery } from '@/modules/repositories';
import { PageHeader } from '@/commons/components/PageHeader';
import { ProjectApiTokens } from '@/features/projects';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { errorMessage } from '@/lib/api/errors';
import { FaIcon } from '@/commons/components/FaIcon';
import { formatDate } from '@/lib/utils/formatDate';
import { StatusPill } from '@/commons/components/StatusPill';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { projectUpdateSchema } from '@/commons/schemas/project.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

interface ProjectDetailPageProps {
  projectId: string;
}

/**
 * Full-page project detail view with tabs for overview, settings, and API tokens.
 *
 * Loads the project by ID and provides inline editing, team/repository assignment, and deletion.
 *
 * @param props - {@link ProjectDetailPageProps}
 * @returns JSX element rendering the project detail page with loading/error states.
 *
 * @example
 * <ProjectDetailPage projectId="proj_123" />
 */
export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const projectQuery = useProjectQuery(projectId);
  const project = projectQuery.data ?? null;
  const updateMutation = useUpdateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();
  const { confirm } = useConfirm();

  const teamsQuery = useTeamsQuery({ page: 1, perPage: 100 });
  const membersQuery = useMembersQuery(session.data?.workspace?.id ?? '', { page: 1, perPage: 1000 });
  const reposQuery = useRepositoriesQuery({ page: 1, perPage: 200 });

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const rule = createZodSync(projectUpdateSchema);

  const teamOptions = (teamsQuery.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  const memberOptions = (membersQuery.data?.data ?? [])
    .filter((m, i, arr) => arr.findIndex((x) => x.userId === m.userId) === i)
    .map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` }));
  const repoOptions = (reposQuery.data?.data ?? []).map((r) => ({ value: r.id, label: r.name }));

  useEffect(() => {
    if (project && isEditing) {
      form.setFieldsValue({
        name: project.name,
        description: project.description || '',
        lead: project.lead || '',
        repositoryIds: project.repositories || [],
        teamIds: project.teams || [],
        memberIds: project.members || [],
      });
    }
  }, [project, isEditing, form]);

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

  const handleSave = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate(
        { id: projectId, payload: values },
        {
          onSuccess: () => {
            message.success('Project updated');
            setIsEditing(false);
            projectQuery.refetch();
          },
          onError: (err) => message.error(errorMessage(err)),
        }
      );
    });
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete project?',
      content: `Delete "${project.name}"? This cannot be undone.`,
      danger: true,
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
      key: 'general',
      label: (
        <span><FaIcon icon="fa-gear" style={{ marginRight: 8 }} /> General</span>
      ),
      children: (
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: token.marginLG }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Project Information</Typography.Title>
            <PermissionGate permission={PERMISSION.PROJECT_MANAGE}>
              {!isEditing ? (
                <Button icon={<FaIcon icon="fa-pen" />} onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              ) : (
                <Flex gap={token.paddingXS}>
                  <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="primary" icon={<FaIcon icon="fa-check" />} onClick={handleSave} loading={updateMutation.isPending}>
                    Save
                  </Button>
                </Flex>
              )}
            </PermissionGate>
          </Flex>

          {isEditing ? (
            <Form form={form} layout="vertical">
              <div style={{ display: 'grid', gap: token.paddingXL, maxWidth: 720 }}>
                <Form.Item label="Project name" name="name" rules={[{ required: true, message: 'Project name is required' }, rule]}>
                  <Input placeholder="e.g. Backend API" />
                </Form.Item>

                <Form.Item label="Description" name="description" rules={[rule]}>
                  <Input.TextArea placeholder="Optional description" rows={3} style={{ resize: 'vertical' }} />
                </Form.Item>

                <Form.Item label="Lead contact" name="lead" rules={[rule]}>
                  <Input placeholder="Optional — not a permission" />
                </Form.Item>

                <Form.Item label="Teams" name="teamIds" rules={[rule]}>
                  <Select mode="multiple" style={{ width: '100%' }} placeholder="Attach teams to this project" options={teamOptions} filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
                </Form.Item>

                <Form.Item label="Direct members" name="memberIds" extra="For individual access outside of team membership." rules={[rule]}>
                  <Select mode="multiple" style={{ width: '100%' }} placeholder="Add individual member access" options={memberOptions} filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
                </Form.Item>

                <Form.Item label="Repositories" name="repositoryIds" rules={[rule]}>
                  <Select mode="multiple" style={{ width: '100%' }} placeholder="Attach repositories to this project" options={repoOptions} filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
                </Form.Item>
              </div>
            </Form>
          ) : (
            <>
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="Name">
                  <Typography.Text strong>{project.name}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Lead">
                  {project.lead || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {project.createdAt ? formatDate(project.createdAt) : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  {project.description || 'No description provided.'}
                </Descriptions.Item>
              </Descriptions>

              <Card style={{ marginTop: token.marginLG }} styles={{ body: { padding: token.paddingXL } }} title="Repositories" size="small">
                {(project.repositories ?? []).length > 0 ? (
                  <Flex wrap="wrap" gap={token.paddingXS}>
                    {project.repositories.map((r) => <StatusPill key={r} variant="slate">{r}</StatusPill>)}
                  </Flex>
                ) : (
                  <Typography.Text type="secondary">No repositories attached.</Typography.Text>
                )}
              </Card>

              <Card style={{ marginTop: token.marginLG }} styles={{ body: { padding: token.paddingXL } }} title="Teams" size="small">
                {(project.teamNames ?? project.teams ?? []).length > 0 ? (
                  <Flex wrap="wrap" gap={token.paddingXS}>
                    {(project.teamNames ?? project.teams ?? []).map((t, i) => <StatusPill key={project.teams?.[i] ?? t} variant="teal">{t}</StatusPill>)}
                  </Flex>
                ) : (
                  <Typography.Text type="secondary">No teams assigned.</Typography.Text>
                )}
              </Card>

              <Card style={{ marginTop: token.marginLG }} styles={{ body: { padding: token.paddingXL } }} title="Members" size="small">
                {(project.memberNames ?? project.members ?? []).length > 0 ? (
                  <Flex wrap="wrap" gap={token.paddingXS}>
                    {(project.memberNames ?? project.members ?? []).map((m, i) => <StatusPill key={project.members?.[i] ?? m} variant="slate">{m}</StatusPill>)}
                  </Flex>
                ) : (
                  <Typography.Text type="secondary">No direct members.</Typography.Text>
                )}
              </Card>
            </>
          )}
        </Card>
      ),
    },
    {
      key: 'api-tokens',
      label: (
        <span><FaIcon icon="fa-key" style={{ marginRight: 8 }} /> API Tokens</span>
      ),
      children: (
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <ProjectApiTokens projectId={projectId} />
        </Card>
      ),
    },
  ];

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title={project.name}
        description="Manage project settings, repositories, teams, and API tokens."
        breadcrumbs={[
          { label: 'Projects', href: `/${workspaceSlug}/projects` },
          { label: project.name },
        ]}
        actions={
          <PermissionGate permission={PERMISSION.PROJECT_MANAGE}>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete} loading={deleteMutation.isPending}>
              Delete Project
            </Button>
          </PermissionGate>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: token.marginMD }}>
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Statistic title="Repositories" value={(project.repositories ?? []).length} prefix={<FaIcon icon="fa-code-branch" style={{ color: token.colorPrimary }} />} />
        </Card>
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Statistic title="Teams" value={(project.teams ?? []).length} prefix={<FaIcon icon="fa-people-group" style={{ color: token.colorSuccess }} />} />
        </Card>
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Statistic title="Members" value={(project.members ?? []).length} prefix={<FaIcon icon="fa-users" style={{ color: token.colorInfo }} />} />
        </Card>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(tab) => { setActiveTab(tab); router.replace(`?tab=${tab}`, { scroll: false }); }}
        items={tabItems}
        size="large"
      />
    </Flex>
  );
}

