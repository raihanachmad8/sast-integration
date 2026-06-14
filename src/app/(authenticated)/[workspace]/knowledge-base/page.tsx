'use client';

import { useMemo, useState } from 'react';
import { Card, Col, Flex, Row, Space, Tag, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusTag } from '@/components/shared/StatusTag';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useSessionData } from '@/modules/auth/queries';
import {
  useKnowledgeBaseQuery,
  useKnowledgeSourcesQuery,
} from '@/modules/knowledge';
import { errorMessage } from '@/lib/api/errors';
import { EntryDetailDrawer } from '@/features/knowledge-base/EntryModals';
import type { KnowledgeEntryRow } from '@/commons/types/knowledge';

interface ModalEntry {
  id: string;
  name: string;
  source: string;
  severity: string;
  usedByAi: number;
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
    usedByAi: entry.usedByAiCount ?? 0,
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
    {
      key: 'usedByAi',
      header: 'Used by AI',
      render: (row) => <Typography.Text type="secondary">{row.usedByAi}</Typography.Text>,
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
  const session = useSessionData();
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
    perPage: params.perPage,
    search: params.search || undefined,
    source: selectedSource,
  });
  const sourcesQuery = useKnowledgeSourcesQuery(workspaceId, { page: 1, perPage: 100 });

  const sources = sourcesQuery.data?.data ?? [];
  const cweSource = sources.find((source) => source.type === 'cwe');
  const nvdSource = sources.find((source) => source.type === 'nvd');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ModalEntry | null>(null);

  const entries = useMemo(() => (entriesQuery.data?.data ?? []).map(toModalEntry), [entriesQuery.data]);

  const handleView = (entry: ModalEntry) => { setSelectedEntry(entry); setDetailOpen(true); };

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
          { label: 'View', icon: <FaIcon icon="fa-eye" />, onClick: (entry) => handleView(entry) },
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
        onChange={(page, pageSize) => { setPage(page); setPageSize(pageSize); }}
      />

      <EntryDetailDrawer
        open={detailOpen}
        entry={selectedEntry}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {}}
        onDisable={() => {}}
      />
    </Flex>
  );
}
