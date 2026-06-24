'use client';

import { useMemo, useState } from 'react';
import { App, Card, Col, Flex, Row, Space, Tag, Typography, theme } from 'antd';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { StatusTag } from '@/commons/components/StatusTag';
import { DataTable, type DataTableColumn } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useKnowledgeBaseQuery, useKnowledgeSourcesQuery, useMuteKnowledgeEntryMutation, useUpdateKnowledgeEntryMutation } from '@/modules/knowledge';
import { useSessionData } from '@/modules/auth/queries';
import type { KnowledgeEntryRow } from '@/commons/types/knowledge';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { EditEntryModal, EntryDetailDrawer } from '@/features/knowledge-base/EntryModals';

interface ModalEntry {
  id: string;
  name: string;
  source: string;
  severity: string;
  snippet: string;
  tags?: string[];
  muted?: boolean;
  updatedAt?: string;
}

const SOURCE_FILTERS = [
  { id: 'cwe', name: 'CWE' },
  { id: 'nvd', name: 'NVD' },
];

function toModalEntry(entry: KnowledgeEntryRow): ModalEntry {
  return {
    id: entry.id,
    name: entry.title,
    source: entry.sourceType ?? 'unknown',
    severity: entry.severity ?? 'medium',
    snippet: entry.remediation ?? entry.content ?? '',
    tags: entry.tags,
    muted: entry.muted,
    updatedAt: entry.createdAt,
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
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: 2 }}>{row.snippet ? row.snippet.slice(0, 80) + (row.snippet.length > 80 ? '...' : '') : ''}</div>
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
  ];
}

function SourceCard({
  type,
  title,
  description,
  entryCount,
}: {
  type: 'cwe' | 'nvd';
  title: string;
  description: string;
  entryCount: number;
}) {
  const { token } = theme.useToken();

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
          <Tag>Active</Tag>
        </Flex>

        <Flex gap={token.marginMD}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Entries</Typography.Text>
            <div style={{ fontSize: token.fontSizeHeading3, fontWeight: token.fontWeightStrong }}>{entryCount}</div>
          </div>
        </Flex>
      </Flex>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.KNOWLEDGE_BASE}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Knowledge Base" description="CWE and NVD knowledge used by AI verification." />
          <ComingSoonCard
            icon="fa-database"
            title="Knowledge Base"
            description="Knowledge Base provides CWE and NVD context for AI verification."
            envHint="FEATURE_FLAG_KNOWLEDGE_BASE"
          />
        </Flex>
      }
    >
      <KnowledgeBasePageContent />
    </FeatureGate>
  );
}

function KnowledgeBasePageContent() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const { has } = usePermissions();
  const canRead = has(PERMISSION.KNOWLEDGE_VIEW);
  const canManage = has(PERMISSION.KNOWLEDGE_MANAGE);

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['source'],
    defaultPageSize: 10,
  });

  const selectedSource = params.filters.source === 'cwe' || params.filters.source === 'nvd'
    ? params.filters.source
    : undefined;

  const entriesQuery = useKnowledgeBaseQuery(workspaceId, {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    source: selectedSource,
  });
  const sourcesQuery = useKnowledgeSourcesQuery(workspaceId, { page: 1, perPage: 100 });
  const muteMutation = useMuteKnowledgeEntryMutation(workspaceId);
  const updateMutation = useUpdateKnowledgeEntryMutation(workspaceId);

  const sources = sourcesQuery.data?.data ?? [];
  const cweSource = sources.find((source) => source.type === 'cwe');
  const nvdSource = sources.find((source) => source.type === 'nvd');

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ModalEntry | null>(null);

  const entries = useMemo(() => (entriesQuery.data?.data ?? []).map(toModalEntry), [entriesQuery.data]);

  const handleView = (entry: ModalEntry) => { setSelectedEntry(entry); setDetailOpen(true); };

  const handleEdit = (_entry: ModalEntry) => {
    setDetailOpen(false);
    setEditOpen(true);
  };

  const handleDisable = (entry: ModalEntry) => {
    muteMutation.mutate(entry.id, {
      onSuccess: () => {
        message.success('Entry disabled');
        setDetailOpen(false);
      },
      onError: (err) => message.error(errorMessage(err)),
    });
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
      />

      <Row gutter={[token.marginMD, token.marginMD]}>
        <Col xs={24} lg={12}>
          <SourceCard
            type="cwe"
            title="CWE Catalog"
            description="Weakness taxonomy for scanner findings and AI context."
            entryCount={cweSource?.entryCount ?? 0}
          />
        </Col>
        <Col xs={24} lg={12}>
          <SourceCard
            type="nvd"
            title="NVD CVE Feed"
            description="Vulnerability feed with historical vulnerability data."
            entryCount={nvdSource?.entryCount ?? 0}
          />
        </Col>
      </Row>

      <DataTable
        source={{ data: entries, meta: { page: params.page, pageSize: params.perPage, total: entriesQuery.data?.meta.total ?? 0 } }}
        columns={buildColumns(token)}
        actions={[
          { label: 'View', icon: <FaIcon icon="fa-eye" />, onClick: (entry) => handleView(entry), show: () => canRead },
          { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (entry) => handleEdit(entry), show: () => canManage },
          { label: 'Disable', icon: <FaIcon icon="fa-ban" />, variant: 'danger' as const, onClick: (entry) => handleDisable(entry), show: () => canManage },
        ]}
        rowKey={(entry) => entry.id}
        emptyText="No knowledge entries found."
        isLoading={entriesQuery.isLoading}
        searchable
        searchPlaceholder="Search knowledge entries"
        searchValue={params.search}
        onSearchChange={setSearch}
        filters={[{ key: 'source', label: 'Source', placeholder: 'All', options: SOURCE_FILTERS.map((source) => ({ value: source.id, label: source.name })) }]}
        filterValues={params.filters}
        onFilterChange={setFilter}
        onChange={(page, pageSize) => setPagination(page, pageSize)}
      />

      <EntryDetailDrawer
        open={detailOpen}
        entry={selectedEntry}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDisable={handleDisable}
      />

      <EditEntryModal
        open={editOpen}
        entry={selectedEntry}
        onClose={() => setEditOpen(false)}
        onSave={(values) => {
          if (!selectedEntry) return;
          updateMutation.mutate(
            { id: selectedEntry.id, data: values },
            {
              onSuccess: () => {
                message.success('Entry updated');
                setEditOpen(false);
              },
              onError: (err) => message.error(errorMessage(err)),
            },
          );
        }}
      />
    </Flex>
  );
}
