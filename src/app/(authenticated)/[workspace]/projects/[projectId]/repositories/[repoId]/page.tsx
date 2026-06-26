'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Space,
  Typography,
  App,
  Flex,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionData } from '@/modules/auth/queries';
import { PageHeader } from '@/commons/components/PageHeader';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorBanner } from '@/commons/components/ErrorBanner';
import { errorMessage } from '@/lib/api/errors';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource } from '@/commons/components/DataTable';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { SCAN_ORIGIN } from '@/commons/constants/layout';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

const { Text } = Typography;

interface Repository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string | null;
  connectionType: string[];
  currentPolicyId: string | null;
}

interface Scan {
  id: string;
  origin: string;
  triggerSource: string | null;
  status: string;
  branch: string | null;
  commitSha: string | null;
  createdAt: string | null;
  policyId?: string | null;
}

interface ScansResponse {
  repository: Repository;
  scans: Scan[];
}

export default function RepositoryDetailScanPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.PROJECTS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Repository" description="View repository scan history and details." />
          <ComingSoonCard
            icon="fa-code-branch"
            title="Projects"
            description="Projects allow you to group repositories and manage scan configurations."
            envHint="FEATURE_FLAG_PROJECTS"
          />
        </Flex>
      }
    >
      <RepositoryDetailScanPageContent />
    </FeatureGate>
  );
}

function RepositoryDetailScanPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const params = useParams<{ workspace: string; projectId: string; repoId: string }>();
  const router = useRouter();
  const session = useSessionData();
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
      const json = (await res.json()) as { data: ScansResponse; message?: string; error?: string };
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
          body: JSON.stringify({ branch: repo.defaultBranch || 'main' }),
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
    onError: (err: Error) => message.error(errorMessage(err)),
  });

  const handleBack = () => {
    router.push(`/${workspaceSlug}/scan`);
  };

  const isExternal = !repo?.connectionType?.includes('scm');
  const canRunManaged = repo?.connectionType?.includes('scm') && !!repo.currentPolicyId;

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
        description={`${repo?.url || ''} ${repo?.defaultBranch ? `• ${repo.defaultBranch}` : ''}`}
        actions={
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={!canRunManaged}
            loading={runScanMutation.isPending}
            onClick={() => runScanMutation.mutate()}
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
            <DataTable
              source={{ data: scans, meta: { page: 1, pageSize: 12, total: scans.length } }}
              rowKey={(row) => row.id}
              columns={[
                { key: 'origin', header: 'Origin', render: (row) => (
                  <StatusPill variant={row.origin === SCAN_ORIGIN.MANAGED ? 'purple' : 'teal'}>
                    {row.origin === SCAN_ORIGIN.MANAGED ? 'Managed' : 'External Upload'}
                  </StatusPill>
                )},
                { key: 'triggerSource', header: 'Trigger', render: (row) => row.triggerSource || '-' },
                { key: 'branch', header: 'Branch', render: (row) => row.branch || '-' },
                { key: 'commitSha', header: 'Commit', render: (row) => row.commitSha ? <Text code style={{ fontSize: token.fontSizeSM }}>{String(row.commitSha).slice(0, 12)}</Text> : '-' },
                { key: 'status', header: 'Status', render: (row) => <StatusPill variant="slate">{row.status}</StatusPill> },
                { key: 'createdAt', header: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
              ]}
              emptyText="No scans recorded for this repository yet."
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
