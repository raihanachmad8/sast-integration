'use client';

import { useState } from 'react';
import { Button, Input, Select, Card, App, Modal, Drawer, Form, Flex, Typography, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
import { useWebhooksQuery, useCreateWebhookMutation, useUpdateWebhookMutation, useDeleteWebhookMutation } from '@/modules/webhooks';
import { FaIcon } from '@/components/shared/fa-icon';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Toolbar } from '@/components/shared/Toolbar';
import { DataTable } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Webhook } from '@/modules/webhooks/api';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

/**
 * Webhooks management page.
 * Configures outgoing product webhooks for scan, finding, report, and gate events.
 *
 * @returns JSX element with webhook table, status filter, and delivery history.
 */
export default function WebhooksPage() {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id;

  const webhooksQuery = useWebhooksQuery();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();

  const [historyOpen, setHistoryOpen] = useState<Webhook | null>(null);
  const [editOpen, setEditOpen] = useState<Webhook | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const webhooks = webhooksQuery.data ?? [];

  const { params, setPage, setPageSize, setSearch, setFilter, filtered: filteredWebhooks = [], paginated: pagedWebhooks = [] } = useTableParams<Webhook>({
    data: webhooks,
    searchField: (wh, q) => wh.name.toLowerCase().includes(q) || wh.url.toLowerCase().includes(q),
    extraFilter: (wh, filters) => {
      if (filters.active === 'active') return wh.enabled === true;
      if (filters.active === 'disabled') return wh.enabled === false;
      return true;
    },
    defaultPageSize: 10,
    filterKeys: ['active'],
  });

  if (!workspaceId) {
    return <LoadingState text="Loading workspace..." />;
  }

  if (webhooksQuery.isLoading) {
    return <LoadingState text="Loading webhooks..." />;
  }

  if (webhooksQuery.error) {
    return <ErrorBanner message={errorMessage(webhooksQuery.error)} />;
  }

  return (
    <Flex vertical gap={token.marginXL}>
      <PageHeader
        title="Webhooks"
        description="Outgoing product webhooks for scan, finding, report, and gate events."
        actions={<PermissionGate permission={PERMISSION.WEBHOOK_MANAGE}><Button type="primary" onClick={() => setCreateOpen(true)}><FaIcon icon="fa-plus" /> New webhook</Button></PermissionGate>}
      />

      <div style={{ padding: token.paddingSM, background: token.colorWarningBg, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorWarning}` }}>
        <Flex align="flex-start" gap={token.marginXS}>
          <FaIcon icon="fa-circle-info" style={{ color: token.colorWarningDark, marginTop: 2 }} />
          <Typography.Text style={{ fontSize: token.fontSize, color: token.colorWarningDark }}>
            <strong>Outgoing webhooks only.</strong> Inbound SCM webhooks stay in Source Control. This page is only for outgoing delivery to external systems.
          </Typography.Text>
        </Flex>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input allowClear style={{ maxWidth: 360, flex: 1 }} placeholder="Search webhooks..." prefix={<FaIcon icon="fa-magnifying-glass" />} value={params.search} onChange={(e) => setSearch(e.target.value)} />
          <Select style={{ width: 180, flexShrink: 0 }} value={params.filters.active ?? 'all'} onChange={(v) => setFilter('active', v === 'all' ? '' : v)} options={STATUS_OPTIONS} />
        </Toolbar>

        <DataTable
            data={pagedWebhooks}
            columns={[
              { key: 'webhook', header: 'Webhook', render: (row) => <div><Typography.Text strong>{row.name}</Typography.Text></div> },
              { key: 'endpoint', header: 'Endpoint', render: (row) => <Typography.Text code style={{ fontSize: token.fontSize, color: token.colorTextSecondary, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.url}>{row.url}</Typography.Text> },
              { key: 'events', header: 'Events', render: (row) => (
                <Flex gap={token.marginXS} wrap="wrap">
                  {row.events.map((e) => <StatusPill key={e} variant="slate">{e}</StatusPill>)}
                </Flex>
              )},
              { key: 'status', header: 'Status', render: (row) => <StatusPill variant={row.enabled ? 'teal' : 'amber'}>{row.enabled ? 'Active' : 'Disabled'}</StatusPill> },
              { key: 'actions', header: 'Actions', align: 'right', render: (row) => (
                <Flex justify="flex-end" gap={token.marginXS}>
                  <Button size="small" onClick={() => setHistoryOpen(row)}><FaIcon icon="fa-clock-rotate-left" /> History</Button>
                  <Button size="small" onClick={() => message.loading(`Sending test to ${row.name}...`, 2).then(() => message.success('Test delivered'))}><FaIcon icon="fa-paper-plane" /> Test</Button>
                  <Button size="small" onClick={() => { setEditName(row.name); setEditUrl(row.url); setEditOpen(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
                  <Button size="small" onClick={() => {
                    updateMutation.mutate({ id: row.id, data: { enabled: !row.enabled } }, { onSuccess: () => message.success(`${row.name} ${row.enabled ? 'disabled' : 'enabled'}`) });
                  }}><FaIcon icon={row.enabled ? 'fa-toggle-off' : 'fa-toggle-on'} /> {row.enabled ? 'Disable' : 'Enable'}</Button>
                  <Button size="small" danger onClick={() => {
                    modal.confirm({ title: `Delete "${row.name}"?`, content: 'This webhook will stop receiving events.', okText: 'Delete', okButtonProps: { danger: true },
                      onOk: () => deleteMutation.mutate(row.id, { onSuccess: () => message.success(`${row.name} deleted`) })
                    });
                  }}>Delete</Button>
                </Flex>
              )},
            ]}
            rowKey={(row) => row.id}
            emptyText="No webhooks configured."
          />

        <TableFooter current={params.page} pageSize={params.per_page} total={filteredWebhooks.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
      </Card>

      {/* Delivery history drawer */}
      <Drawer title={`${historyOpen?.name ?? ''} — Delivery History`} open={!!historyOpen} onClose={() => setHistoryOpen(null)} size="large">
        <Flex vertical align="center" style={{ color: token.colorTextSecondary, padding: token.paddingXL }}>
          No deliveries yet.
        </Flex>
      </Drawer>

      {/* Create webhook modal */}
      <Modal title="New webhook" open={createOpen} onOk={() => {
        createMutation.mutate({ name: newName, url: newUrl, events: [] }, { onSuccess: () => { setCreateOpen(false); setNewName(''); setNewUrl(''); message.success('Webhook created'); } });
      }} onCancel={() => setCreateOpen(false)} okText="Create" confirmLoading={createMutation.isPending}>
        <Form layout="vertical">
          <Flex vertical gap={token.marginSM}>
            <Form.Item label="Name"><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></Form.Item>
            <Form.Item label="URL"><Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} /></Form.Item>
          </Flex>
        </Form>
      </Modal>

      {/* Edit webhook modal */}
      <Modal title="Edit webhook" open={!!editOpen} onOk={() => {
        if (editOpen) {
          updateMutation.mutate({ id: editOpen.id, data: { name: editName, url: editUrl } }, { onSuccess: () => { setEditOpen(null); message.success('Webhook updated'); } });
        }
      }} onCancel={() => setEditOpen(null)} okText="Save" confirmLoading={updateMutation.isPending}>
        <Form layout="vertical">
          <Flex vertical gap={token.marginSM}>
            <Form.Item label="Name"><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></Form.Item>
            <Form.Item label="URL"><Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} /></Form.Item>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}
