'use client';

import { useMemo, useState } from 'react';
import { App, Button, Card, Col, Flex, Progress, Row, Space, Tag, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusTag } from '@/components/shared/StatusTag';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useSessionQuery } from '@/modules/auth/queries';
import {
  useKnowledgeBaseQuery,
  useKnowledgeSourcesQuery,
  useCreateKnowledgeSourceMutation,
  useDeleteKnowledgeBaseEntryMutation,
  useStartKnowledgeBackfillMutation,
  useSyncKnowledgeSourceMutation,
  useUpdateKnowledgeBaseEntryMutation,
} from '@/modules/knowledge';
import { errorMessage } from '@/lib/api/errors';
import { EntryDetailDrawer, EditEntryModal } from '@/features/knowledge-base/EntryModals';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import type { KnowledgeEntryRow, KnowledgeSource } from '@/commons/types/knowledge';

interface ModalEntry {
  id: string;
  name: string;
  source: string;
  severity: string;
  usedByAi: string;
  snippet: string;
}

const SOURCE_FILTERS = [
  { id: 'cwe', name: 'CWE' },
  { id: 'nvd', name: 'NVD' },
];

const DEFAULT_SOURCE_CONFIG = {
  cwe: { name: 'CWE Catalog', url: 'https://cwe.mitre.org/data/index.html' },
  nvd: { name: 'NVD CVE Feed', url: 'https://services.nvd.nist.gov/rest/json/cves/2.0' },
} as const;

function toModalEntry(entry: KnowledgeEntryRow): ModalEntry {
  return {
    id: entry.id,
    name: entry.title,
    source: entry.sourceType ?? 'unknown',
    severity: entry.severity ?? 'medium',
    usedByAi: String(entry.usedByAiCount ?? 0),
    snippet: entry.remediation ?? entry.content ?? '',
  };
}

function buildColumns(token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<ModalEntry>[] {
  return [
    {
      key: 'name',
      header: 'Entry',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>{row.name}</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: 2 }}>{row.snippet}</div>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <StatusTag type="knowledgeSource" value={row.source} />,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <StatusTag type="severity" value={row.severity} />,
    },
    {
      key: 'usedByAi',
      header: 'Used by AI',
      render: (row) => <Typography.Text type="secondary">{row.usedByAi}</Typography.Text>,
    },
  ];
}

function SourceProgressCard({
  source,
  type,
  title,
  description,
  isBusy,
  onSync,
  onBackfill,
}: {
  source?: KnowledgeSource;
  type: 'cwe' | 'nvd';
  title: string;
  description: string;
  isBusy: boolean;
  onSync: () => void;
  onBackfill?: () => void;
}) {
  const { token } = theme.useToken();
  const sourceStatus = source?.status ?? 'disconnected';
  const progress = sourceStatus === 'connected' ? 100 : sourceStatus === 'syncing' ? -1 : 0;
  const statusLabel = sourceStatus === 'connected' ? 'Completed' : sourceStatus === 'syncing' ? 'Syncing' : 'Not started';
  const backfillRunning = sourceStatus === 'syncing';

  return (
    <Card size="small" style={{ height: '100%' }}>
      <Flex vertical gap={token.paddingMD}>
        <Flex justify="space-between" align="flex-start" gap={token.paddingSM}>
          <Space align="start">
            <Flex
              align="center"
              justify="center"
              style={{ width: 40, height: 40, borderRadius: token.borderRadius, background: token.colorBgLayout }}
            >
              <FaIcon icon={type === 'nvd' ? 'fa-database' : 'fa-shield-halved'} />
            </Flex>
            <div>
              <Typography.Text strong>{title}</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: token.fontSizeSM }}>
                {description}
              </Typography.Paragraph>
            </div>
          </Space>
          <Tag>{statusLabel}</Tag>
        </Flex>

        <Row gutter={token.marginMD}>
          <Col span={12}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Entries</Typography.Text>
            <div style={{ fontSize: token.fontSizeHeading3, fontWeight: token.fontWeightStrong }}>{source?.entryCount ?? 0}</div>
          </Col>
          <Col span={12}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {type === 'nvd' ? 'Backfill' : 'Catalog'}
            </Typography.Text>
            <Progress percent={progress < 0 ? 0 : progress} size="small" status={progress < 0 ? 'active' : undefined} />
          </Col>
        </Row>

        <Flex gap={token.paddingSM} wrap="wrap">
          <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
            <Button size="small" onClick={onSync} loading={isBusy} icon={<FaIcon icon="fa-arrows-rotate" />}>
              {source ? 'Sync' : 'Start'}
            </Button>
          </PermissionGate>
          {type === 'nvd' && onBackfill && (
            <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
              <Button size="small" onClick={onBackfill} loading={isBusy || backfillRunning} icon={<FaIcon icon="fa-clock-rotate-left" />}>
                {backfillRunning ? 'Running' : sourceStatus === 'connected' ? 'Resume' : 'Start'}
              </Button>
            </PermissionGate>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['source'],
    defaultPageSize: 10,
  });

  const selectedSource = params.filters.source === 'cwe' || params.filters.source === 'nvd'
    ? params.filters.source
    : undefined;

  const entriesQuery = useKnowledgeBaseQuery(workspaceId, {
    page: params.page,
    per_page: params.per_page,
    search: params.search || undefined,
    source: selectedSource,
  });
  const sourcesQuery = useKnowledgeSourcesQuery(workspaceId, { page: 1, per_page: 100 });
  const syncMutation = useSyncKnowledgeSourceMutation(workspaceId);
  const createSourceMutation = useCreateKnowledgeSourceMutation(workspaceId);
  const deleteMutation = useDeleteKnowledgeBaseEntryMutation(workspaceId);
  const updateEntryMutation = useUpdateKnowledgeBaseEntryMutation(workspaceId);
  const startBackfillMutation = useStartKnowledgeBackfillMutation(workspaceId);

  const sources = sourcesQuery.data?.data ?? [];
  const cweSource = sources.find((source) => source.type === 'cwe');
  const nvdSource = sources.find((source) => source.type === 'nvd');

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ModalEntry | null>(null);

  const entries = useMemo(() => (entriesQuery.data?.data ?? []).map(toModalEntry), [entriesQuery.data]);

  const ensureSource = async (type: 'cwe' | 'nvd') => {
    const existing = type === 'cwe' ? cweSource : nvdSource;
    if (existing) return existing;
    const config = DEFAULT_SOURCE_CONFIG[type];
    return createSourceMutation.mutateAsync({ name: config.name, type, url: config.url });
  };

  const handleSyncSource = async (type: 'cwe' | 'nvd') => {
    const source = await ensureSource(type);
    await syncMutation.mutateAsync(source.id);
    message.success(`${source.name} synced`);
  };

  const handleSyncAll = async () => {
    const cwe = await ensureSource('cwe');
    const nvd = await ensureSource('nvd');
    await Promise.all([syncMutation.mutateAsync(cwe.id), syncMutation.mutateAsync(nvd.id)]);
    message.success('Knowledge data synced');
  };

  const handleStartBackfill = async () => {
    const source = await ensureSource('nvd');
    await startBackfillMutation.mutateAsync(source.id);
    message.success('NVD backfill queued');
  };

  const handleView = (entry: ModalEntry) => { setSelectedEntry(entry); setDetailOpen(true); };
  const handleEdit = (entry: ModalEntry) => { setSelectedEntry(entry); setEditOpen(true); };
  const handleDisable = (entry: ModalEntry) => {
    confirm({
      title: 'Disable entry?',
      content: `Disable "${entry.name}"? It will no longer be used in AI verification.`,
      okText: 'Disable',
      danger: true,
      onOk: async () => {
        await deleteMutation.mutateAsync(entry.id);
        message.success(`${entry.name} has been disabled.`);
      },
    });
  };

  const handleSaveEdit = async (values: { title: string; source: string; severity: string; content: string }) => {
    if (!selectedEntry) return;
    await updateEntryMutation.mutateAsync({
      id: selectedEntry.id,
      data: {
        title: values.title,
        content: values.content,
        severity: values.severity as 'low' | 'medium' | 'high' | 'critical',
      },
    });
    message.success('Entry updated');
    setEditOpen(false);
  };

  if (session.isLoading || entriesQuery.isLoading || sourcesQuery.isLoading) return <LoadingState text="Loading knowledge base..." />;
  if (!workspaceId) return <ErrorState title="Workspace unavailable" description="Select a workspace before opening the knowledge base." onRetry={() => session.refetch()} />;
  if (entriesQuery.isError) return <ErrorState title="Failed to load knowledge base" description={errorMessage(entriesQuery.error)} onRetry={() => entriesQuery.refetch()} />;
  if (sourcesQuery.isError) return <ErrorState title="Failed to load knowledge sources" description={errorMessage(sourcesQuery.error)} onRetry={() => sourcesQuery.refetch()} />;

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Knowledge Base"
        description="CWE and NVD knowledge used by AI verification."
        actions={
          <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
            <Button onClick={handleSyncAll} loading={syncMutation.isPending || createSourceMutation.isPending} icon={<FaIcon icon="fa-arrows-rotate" />}>
              Sync
            </Button>
          </PermissionGate>
        }
      />

      <Row gutter={[token.marginMD, token.marginMD]}>
        <Col xs={24} lg={12}>
          <SourceProgressCard
            type="cwe"
            title="CWE Catalog"
            description="Weakness taxonomy for scanner findings and AI context."
            source={cweSource}
            isBusy={syncMutation.isPending || createSourceMutation.isPending}
            onSync={() => handleSyncSource('cwe')}
          />
        </Col>
        <Col xs={24} lg={12}>
          <SourceProgressCard
            type="nvd"
            title="NVD CVE Feed"
            description="Vulnerability feed with historical backfill progress."
            source={nvdSource}
            isBusy={syncMutation.isPending || createSourceMutation.isPending || startBackfillMutation.isPending}
            onSync={() => handleSyncSource('nvd')}
            onBackfill={handleStartBackfill}
          />
        </Col>
      </Row>

      <DataTable
        source={{ data: entries, meta: { page: params.page, pageSize: params.per_page, total: entriesQuery.data?.meta.total ?? 0 } }}
        columns={buildColumns(token)}
        actions={[
          { label: 'View', icon: <FaIcon icon="fa-eye" />, onClick: (entry) => handleView(entry) },
          { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (entry) => handleEdit(entry) },
          { label: 'Disable', icon: <FaIcon icon="fa-volume-xmark" />, onClick: (entry) => handleDisable(entry), variant: 'danger' },
        ]}
        rowKey={(entry) => entry.id}
        emptyText="No entries found. Start CWE or NVD sync to import knowledge data."
        isLoading={entriesQuery.isLoading}
        searchable
        searchPlaceholder="Search knowledge entries"
        searchValue={params.search}
        onSearchChange={setSearch}
        filters={[{ key: 'source', label: 'Source', placeholder: 'All', options: SOURCE_FILTERS.map((source) => ({ value: source.id, label: source.name })) }]}
        filterValues={params.filters}
        onFilterChange={setFilter}
        onChange={(page, pageSize) => { setPage(page); setPageSize(pageSize); }}
      />

      <EntryDetailDrawer open={detailOpen} entry={selectedEntry} onClose={() => setDetailOpen(false)} onEdit={handleEdit} onDisable={handleDisable} />
      <EditEntryModal open={editOpen} entry={selectedEntry} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
    </Flex>
  );
}
