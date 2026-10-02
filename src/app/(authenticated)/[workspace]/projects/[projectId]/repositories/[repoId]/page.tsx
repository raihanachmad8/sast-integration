'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Space,
  Table,
  Tag,
  Typography,
  App,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionQuery } from '@/modules/auth/queries';
import { RepositoryScanPolicy } from '@/features/scan/RepositoryScanPolicy';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  REPOSITORY_CONNECTION_TYPES,
  SCAN_ORIGINS,
  type RepositoryConnectionType,
  type ScanOrigin,
} from '@/commons/constants/scan';
import { ROUTES } from '@/commons/constants/routes';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const { Text } = Typography;

type ApiEnvelope<T> = { data: T; message?: string };

interface Repository {
  id: string;
  name: string;
  url: string;
  default_branch: string | null;
  connection_type: RepositoryConnectionType;
  current_policy_id: string | null;
}

interface Scan {
  id: string;
  origin: ScanOrigin;
  trigger_source: string | null;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  created_at: string | null;
  policy_id?: string | null;
}

interface ScansResponse {
  repository: Repository;
  scans: Scan[];
}

/**
 * Repository Detail Page — Scan Management Tab.
 * Uses Ant Design theme tokens for consistent styling.
 */
export default function RepositoryDetailScanPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const params = useParams<{ workspace: string; projectId: string; repoId: string }>();
  const router = useRouter();
  const session = useSessionQuery();
  const queryClient = useQueryClient();

  const workspaceSlug = params.workspace;
  const projectId = params.projectId;
  const repoId = params.repoId;
  const workspaceId = session.data?.workspace?.id;

  const scansQuery = useQuery({
    queryKey: ['repository-detail-scans', workspaceId, projectId, repoId],
    enabled: !!workspaceId && !!projectId && !!repoId,
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans`
      );
      const json = (await res.json()) as ApiEnvelope<ScansResponse> & { error?: string };
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load repository');
      return json.data;
    },
  });

  const repo = scansQuery.data?.repository;
  const scans = scansQuery.data?.scans ?? [];

  const runScanMutation = useMutation({
    mutationFn: async () => {
      if (!repo) throw new Error('Repository not loaded');
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: repo.default_branch || 'main' }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to queue scan');
      return json;
    },
    onSuccess: () => {
      message.success('Managed scan queued successfully');
      queryClient.invalidateQueries({
        queryKey: ['repository-detail-scans', workspaceId, projectId, repoId],
      });
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleBack = () => {
    router.push(ROUTES.WORKSPACE.SCAN_MANAGEMENT(workspaceSlug));
  };

  const handlePolicyChanged = () => {
    scansQuery.refetch();
  };

  const isExternal = repo?.connection_type === REPOSITORY_CONNECTION_TYPES.EXTERNAL;
  const canRunManaged = repo?.connection_type === REPOSITORY_CONNECTION_TYPES.SCM && !!repo.current_policy_id;

  if (!workspaceId) {
    return <LoadingState text="Loading workspace..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: `0 ${token.paddingLG}px` }}>
      <Space style={{ marginBottom: token.marginLG }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Back to Scan Management
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => scansQuery.refetch()}
          loading={scansQuery.isFetching}
        >
          Refresh
        </Button>
      </Space>

      <PageHeader
        title={repo?.name || 'Repository'}
        description={`${repo?.url || ''} ${repo?.default_branch ? `• ${repo.default_branch}` : ''}`}
        actions={
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={!canRunManaged}
            loading={runScanMutation.isPending}
          >
            Run Scan
          </Button>
        }
      />

      {scansQuery.isLoading && <LoadingState text="Loading repository data..." />}

      {scansQuery.isError && (
        <ErrorBanner message="Failed to load repository data" />
      )}

      {!scansQuery.isLoading && !scansQuery.isError && repo && (
        <>
          <RepositoryScanPolicy
            workspaceId={workspaceId}
            projectId={projectId}
            repositoryId={repoId}
            currentPolicyId={repo.current_policy_id}
            connectionType={repo.connection_type}
            onManualScanTrigger={() => runScanMutation.mutate()}
            onPolicyChanged={handlePolicyChanged}
          />

          {isExternal && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: token.marginLG }}
              message="Upload-only repository"
              description="This repository only accepts pre-generated scan results via the upload API. Managed execution (SCM checkout + scanner run) requires an SCM-connected repository."
            />
          )}

          <Card title="Scan History" style={{ marginTop: token.marginXXL }} size="small">
            <Table
              rowKey="id"
              size="middle"
              dataSource={scans}
              pagination={{ pageSize: 12 }}
              locale={{ emptyText: 'No scans recorded for this repository yet.' }}
              scroll={{ x: 600 }}
              columns={[
                {
                  title: 'Origin',
                  dataIndex: 'origin',
                  render: (value: ScanOrigin) => (
                    <Tag color={value === SCAN_ORIGINS.MANAGED ? 'purple' : 'cyan'}>
                      {value === SCAN_ORIGINS.MANAGED ? 'Managed' : 'External Upload'}
                    </Tag>
                  ),
                },
                {
                  title: 'Trigger',
                  dataIndex: 'trigger_source',
                  render: (v) => v || '-',
                },
                {
                  title: 'Branch',
                  dataIndex: 'branch',
                  render: (v) => v || '-',
                },
                {
                  title: 'Commit',
                  dataIndex: 'commit_sha',
                  render: (value) =>
                    value ? <Text code style={{ fontSize: token.fontSizeSM }}>{String(value).slice(0, 12)}</Text> : '-',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (value) => <Tag>{value}</Tag>,
                },
                {
                  title: 'Created',
                  dataIndex: 'created_at',
                  render: (value) => (value ? new Date(value).toLocaleString() : '-'),
                },
              ]}
            />
          </Card>

          <Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginTop: token.marginSM }}>
            Managed scans are executed by the platform according to the attached policy.
            External uploads come directly from your CI pipelines using a Project API Token.
          </Text>
        </>
      )}
    </div>
  );
}
