'use client';

import { useState, useMemo } from 'react';
import { Button, Input, App, Card, Tag, Flex, Typography, theme, Modal, Form, Select } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Toolbar } from '@/components/shared/Toolbar';
import { TableFooter } from '@/components/shared/TableFooter';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusPill } from '@/components/shared/StatusPill';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useSessionQuery } from '@/modules/auth/queries';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { errorMessage } from '@/lib/api/errors';
import {
  useKnowledgeSourcesQuery,
  useCreateKnowledgeSourceMutation,
  useUpdateKnowledgeSourceMutation,
  useDeleteKnowledgeSourceMutation,
  useSyncKnowledgeSourceMutation,
} from '@/modules/knowledge-base';
import type { KnowledgeBaseSource } from '@/modules/knowledge-base/api';

const SOURCE_TYPE_OPTIONS = [
  { value: 'cwe', label: 'CWE' },
  { value: 'nvd', label: 'NVD' },
  { value: 'mitre', label: 'MITRE' },
  { value: 'custom', label: 'Custom Rules' },
];

function statusVariant(status: string): 'teal' | 'blue' | 'amber' | 'red' | 'slate' {
  if (status === 'connected') return 'teal';
  if (status === 'syncing') return 'blue';
  if (status === 'error') return 'red';
  if (status === 'disconnected') return 'slate';
  return 'amber';
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface SourceFormValues {
  name: string;
  type: string;
  url?: string;
}

function buildColumns(
  token: ReturnType<typeof theme.useToken>['token'],
  handleSync: (s: KnowledgeBaseSource) => void,
  handleEdit: (s: KnowledgeBaseSource) => void,
  handleDelete: (s: KnowledgeBaseSource) => void,
): DataTableColumn<KnowledgeBaseSource>[] {
  return [
    {
      key: 'name',
      header: 'Source',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>{row.name}</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: 2 }}>
            {row.url || 'No URL'}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Tag>{row.type.toUpperCase()}</Tag>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill variant={statusVariant(row.status)}>{row.status}</StatusPill>,
    },
    {
      key: 'entry_count',
      header: 'Entries',
      align: 'center',
      sortable: true,
      sortValue: (row) => row.entryCount,
      render: (row) => (
        <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>
          {row.entryCount}
        </Typography.Text>
      ),
    },
    {
      key: 'last_synced_at',
      header: 'Last Sync',
      render: (row) => (
        <Typography.Text type="secondary">
          {formatRelativeTime(row.lastSyncedAt ?? undefined)}
        </Typography.Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); handleSync(row); }}
            disabled={row.status === 'syncing'}
          >
            <FaIcon icon="fa-arrows-rotate" /> Sync
          </Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
            <FaIcon icon="fa-pen" /> Edit
          </Button>
          <Button size="small" danger onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
            <FaIcon icon="fa-trash" /> Delete
          </Button>
        </Flex>
      ),
    },
  ];
}

export default function KnowledgeSourcesPage() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const sourcesQuery = useKnowledgeSourcesQuery(workspaceId);
  const createMutation = useCreateKnowledgeSourceMutation(workspaceId);
  const updateMutation = useUpdateKnowledgeSourceMutation(workspaceId);
  const deleteMutation = useDeleteKnowledgeSourceMutation(workspaceId);
  const syncMutation = useSyncKnowledgeSourceMutation(workspaceId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeBaseSource | null>(null);
  const [form] = Form.useForm<SourceFormValues>();

  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);

  const { params, setPage, setPageSize, setSearch, paginated } = useTableParams<KnowledgeBaseSource>({
    data: sources,
    searchField: (item, q) => `${item.name} ${item.type} ${item.status}`.toLowerCase().includes(q),
    defaultPageSize: 10,
  });

  const handleCreate = () => {
    setEditingSource(null);
    form.resetFields();
    form.setFieldsValue({ type: 'cwe' });
    setModalOpen(true);
  };

  const handleEdit = (source: KnowledgeBaseSource) => {
    setEditingSource(source);
    form.setFieldsValue({ name: source.name, type: source.type, url: source.url ?? '' });
    setModalOpen(true);
  };

  const handleDelete = (source: KnowledgeBaseSource) => {
    modal.confirm({
      title: 'Delete knowledge source?',
      content: `Delete "${source.name}"? Entries from this source will NOT be removed.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMutation.mutateAsync(source.id);
        message.success(`${source.name} deleted`);
      },
    });
  };

  const handleSync = async (source: KnowledgeBaseSource) => {
    message.loading(`Syncing ${source.name}...`, 2);
    await syncMutation.mutateAsync(source.id);
    message.success(`${source.name} synced successfully`);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSource) {
      await updateMutation.mutateAsync({ sourceId: editingSource.id, data: values });
      message.success('Source updated');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Source created');
    }
    setModalOpen(false);
  };

  if (sourcesQuery.isLoading) {
    return <LoadingState text="Loading knowledge sources..." />;
  }

  if (sourcesQuery.isError) {
    return (
      <ErrorState
        title="Failed to load knowledge sources"
        description={errorMessage(sourcesQuery.error)}
        onRetry={() => sourcesQuery.refetch()}
        retryText="Retry"
      />
    );
  }

  const totalCount = sources.length;
  const connectedCount = sources.filter((s) => s.status === 'connected').length;
  const totalEntries = sources.reduce((sum, s) => sum + (s.entryCount ?? 0), 0);

  return (
    <Flex vertical gap={token.paddingContentHorizontalLG}>
      <PageHeader
        title="Knowledge Sources"
        description="Manage intelligence feeds (CWE, NVD, MITRE) and custom rule sets for AI verification."
        actions={
          <PermissionGate permission={PERMISSION.KNOWLEDGE_MANAGE}>
            <Button type="primary" onClick={handleCreate}>
              <FaIcon icon="fa-plus" /> Add source
            </Button>
          </PermissionGate>
        }
      />

      <Flex gap={token.marginMD} wrap="wrap">
        <Card size="small" style={{ minWidth: 150 }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>
            Total Sources
          </Typography.Text>
          <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong }}>
            {totalCount}
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 150 }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>
            Connected
          </Typography.Text>
          <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, color: token.colorSuccess }}>
            {connectedCount}
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 150 }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>
            Total Entries
          </Typography.Text>
          <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, color: token.colorInfo }}>
            {totalEntries}
          </div>
        </Card>
      </Flex>

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search sources..."
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        {(paginated ?? []).length === 0 ? (
          <EmptyState icon="fa-database" title="No sources found" text="Add a knowledge source to get started." />
        ) : (
          <>
            <DataTable
              data={paginated ?? []}
              columns={buildColumns(token, handleSync, handleEdit, handleDelete)}
              rowKey={(s) => s.id}
              emptyText="No sources found"
            />
            <TableFooter
              current={params.page}
              pageSize={params.per_page}
              total={sources.length}
              onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
            />
          </>
        )}
      </Card>

      <Modal
        title={editingSource ? 'Edit source' : 'Add knowledge source'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingSource ? 'Save' : 'Create'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: token.paddingSM }}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., CWE Top 25" />
          </Form.Item>
          <Form.Item label="Type" name="type">
            <Select options={SOURCE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="URL" name="url">
            <Input placeholder="https://cwe.mitre.org/data/index.html (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}
