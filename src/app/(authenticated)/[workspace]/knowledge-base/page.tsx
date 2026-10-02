'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, App, Card, Segmented, Row, Col, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTag } from '@/components/shared/StatusTag';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useSessionQuery } from '@/modules/auth/queries';
import { useAuthHeaders } from '@/modules/auth/hooks';
import { API_BASE } from '@/commons/constants';
import { parseApiResponse, errorMessage } from '@/lib/api/errors';
import { useKnowledgeBaseQuery, useCreateKnowledgeBaseEntryMutation, useDeleteKnowledgeBaseEntryMutation } from '@/modules/knowledge-base';
import type { KnowledgeBaseEntry } from '@/modules/knowledge-base/api';
import { EntryDetailDrawer, EditEntryModal, CreateCustomRuleModal } from '@/features/knowledge-base/EntryModals';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

function sourceLabel(entry: KnowledgeBaseEntry): string {
  return entry.category || 'Unknown';
}

function toModalEntry(entry: KnowledgeBaseEntry) {
  return {
    id: entry.id,
    name: entry.title,
    source: sourceLabel(entry),
    severity: entry.severity,
    usedByAi: '',
    snippet: entry.description ?? '',
  };
}

function useUpdateEntryMutation(entryId: string | undefined) {
  const headers = useAuthHeaders();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string; content?: string; severity?: string; tags?: string[] }) => {
      const res = await fetch(`${API_BASE}/knowledge-base/${entryId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return parseApiResponse<KnowledgeBaseEntry>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });
}

const SOURCES = [
  { id: 'all', name: 'All Sources' },
  { id: 'cwe', name: 'CWE' },
  { id: 'nvd', name: 'NVD' },
  { id: 'mitre', name: 'MITRE' },
  { id: 'custom', name: 'Custom Rules' },
];

type ModalEntry = ReturnType<typeof toModalEntry>;

function buildColumns(token: ReturnType<typeof theme.useToken>['token'], handleView: (e: ModalEntry) => void, handleEdit: (e: ModalEntry) => void, handleDisable: (e: ModalEntry) => void): DataTableColumn<ModalEntry>[] {
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
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.usedByAi}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleView(row); }}><FaIcon icon="fa-eye" /> View</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
          <Button size="small" danger onClick={(e) => { e.stopPropagation(); handleDisable(row); }}><FaIcon icon="fa-volume-xmark" /> Disable</Button>
        </Flex>
      ),
    },
  ];
}

export default function KnowledgeBasePage() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const _session = useSessionQuery();

  const entriesQuery = useKnowledgeBaseQuery();
  const createMutation = useCreateKnowledgeBaseEntryMutation();
  const deleteMutation = useDeleteKnowledgeBaseEntryMutation();

  const [sourceFilter, setSourceFilter] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ModalEntry | null>(null);

  const updateMutation = useUpdateEntryMutation(selectedEntry?.id);

  const entries = useMemo(() => (entriesQuery.data ?? []).map(toModalEntry), [entriesQuery.data]);

  const { params, setPage, setPageSize, setSearch, setFilter, filtered, paginated } = useTableParams<ModalEntry>({
    data: entries,
    searchField: (item, q) => `${item.name} ${item.source} ${item.severity}`.toLowerCase().includes(q),
    extraFilter: (item, filters) => {
      if (filters.source) return item.source === filters.source;
      return sourceFilter === 'all' || item.source === sourceFilter;
    },
    defaultPageSize: 10,
    filterKeys: ['source'],
  });

  const handleView = (entry: ModalEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  const handleEdit = (entry: ModalEntry) => {
    setSelectedEntry(entry);
    setEditOpen(true);
  };

  const handleDisable = (entry: ModalEntry) => {
    modal.confirm({
      title: 'Disable entry?',
      content: `Disable "${entry.name}"? It will no longer be used in AI verification.`,
      okText: 'Disable',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSelectedEntry(entry);
        await deleteMutation.mutateAsync(entry.id);
        message.success(`${entry.name} has been disabled.`);
      },
    });
  };

  const handleSaveEdit = async (values: { name: string; source: string; severity: string; snippet: string }) => {
    if (!selectedEntry) return;
    await updateMutation.mutateAsync({ title: values.name, content: values.snippet, severity: values.severity });
    message.success('Entry updated');
    setEditOpen(false);
  };

  const handleCreateRule = async (values: { name: string; severity: string; pattern: string; description: string }) => {
    await createMutation.mutateAsync({
      title: values.name,
      description: values.description,
      severity: values.severity,
      category: 'custom',
    });
    message.success('Custom rule created');
    setCreateOpen(false);
  };

  if (entriesQuery.isLoading) {
    return <LoadingState text="Loading knowledge base..." />;
  }

  if (entriesQuery.isError) {
    return <ErrorState title="Failed to load knowledge base" description={errorMessage(entriesQuery.error)} onRetry={() => entriesQuery.refetch()} retryText="Retry" />;
  }

  const apiEntries = entriesQuery.data ?? [];
  const totalCount = apiEntries.length;
  const customCount = apiEntries.filter((e) => e.category === 'custom').length;

  return (
    <Flex vertical gap={token.paddingContentHorizontalLG}>
      <PageHeader
        title="Knowledge Base"
        description="Browse CWE/NVD entries and their associated findings. Supports custom rules."
        actions={
          <Flex gap={token.padding}>
            <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
              <Button onClick={() => message.loading('Syncing knowledge base...', 2).then(() => message.success('Sync complete'))}><FaIcon icon="fa-arrows-rotate" /> Sync all</Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
              <Button type="primary" onClick={() => setCreateOpen(true)}><FaIcon icon="fa-plus" /> Custom rule</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <Row gutter={[token.marginMD, token.marginMD]}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Total entries</Typography.Text>
            <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong }}>{totalCount}</div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Sources</Typography.Text>
            <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, color: token.colorTealAccent }}>{SOURCES.length - 1}</div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Custom rules</Typography.Text>
            <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, color: token.colorWarning }}>{customCount}</div>
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
          <Flex gap={token.marginMD} align="center" wrap="wrap">
            <Input
              allowClear
              style={{ maxWidth: 360, flex: 1 }}
              placeholder="Search knowledge base"
              prefix={<FaIcon icon="fa-magnifying-glass" />}
              value={params.search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Segmented
              value={(params.filters.source ?? 'all')}
              onChange={(val) => { setSourceFilter(val as string); setFilter('source', val === 'all' ? '' : val as string); }}
              options={SOURCES.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Flex>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="fa-book" title="No entries found" text="Try adjusting your search or filters." />
        ) : (
          <>
            <DataTable
              data={paginated}
              columns={buildColumns(token, handleView, handleEdit, handleDisable)}
              rowKey={(e) => e.id}
              emptyText="No entries found"
            />
            <TableFooter current={params.page} pageSize={params.per_page} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
          </>
        )}
      </Card>

      <EntryDetailDrawer open={detailOpen} entry={selectedEntry} onClose={() => setDetailOpen(false)} onEdit={handleEdit} onDisable={handleDisable} />
      <EditEntryModal open={editOpen} entry={selectedEntry} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <CreateCustomRuleModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreateRule} />
    </Flex>
  );
}
