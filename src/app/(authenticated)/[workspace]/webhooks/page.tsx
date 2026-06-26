'use client';

import { useState } from 'react';
import { Button, App, Drawer, Flex, Tag, Typography, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSessionData } from '@/modules/auth/queries';
import { useWebhooksQuery, useCreateWebhookMutation, useUpdateWebhookMutation, useDeleteWebhookMutation, useTestWebhookMutation } from '@/modules/webhooks';
import { FaIcon } from '@/commons/components/FaIcon';
import { PageHeader } from '@/commons/components/PageHeader';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource } from '@/commons/components/DataTable';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorBanner } from '@/commons/components/ErrorBanner';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { WEBHOOK_STATUS } from '@/commons/constants/layout';
import { PERMISSION } from '@/commons/constants/permissions';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { WebhookFormModal } from '@/features/webhooks';
import type { WebhookRow } from '@/commons/types/webhooks';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

/**
 * Webhooks page — configure outgoing product webhooks.
 *
 * Routes: `/{workspaceSlug}/webhooks`
 */
export default function WebhooksPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.WEBHOOKS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Webhooks" description="Outgoing product webhooks for scan, finding, report, and gate events." />
          <ComingSoonCard
            icon="fa-satellite-dish"
            title="Webhooks"
            description="Outgoing webhooks allow you to send events to external systems."
            envHint="FEATURE_FLAG_WEBHOOKS"
          />
        </Flex>
      }
    >
      <WebhooksPageContent />
    </FeatureGate>
  );
}

function WebhooksPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id;

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['active'],
    defaultPageSize: 10,
  });

  const webhooksQuery = useWebhooksQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    active: params.filters.active || undefined,
  });
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const testMutation = useTestWebhookMutation();

  const [historyOpen, setHistoryOpen] = useState<WebhookRow | null>(null);
  const [editOpen, setEditOpen] = useState<WebhookRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
    <PermissionGate permission={PERMISSION.WEBHOOK_VIEW} fallback={<PermissionHint permission={PERMISSION.WEBHOOK_VIEW} />}>
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Webhooks"
        description="Outgoing product webhooks for scan, finding, report, and gate events."
        actions={<PermissionGate permission={PERMISSION.WEBHOOK_MANAGE}><Button type="primary" onClick={() => setCreateOpen(true)} icon={<FaIcon icon="fa-plus" />}>New webhook</Button></PermissionGate>}
      />

      <div style={{ padding: token.paddingSM, background: token.colorWarningBg, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorWarning}` }}>
        <Flex align="flex-start" gap={token.marginXS}>
          <FaIcon icon="fa-circle-info" style={{ color: token.colorWarning, marginTop: 2 }} />
          <Typography.Text style={{ fontSize: token.fontSize, color: token.colorWarning }}>
            <strong>Outgoing webhooks only.</strong> Inbound SCM webhooks stay in Source Control. This page is only for outgoing delivery to external systems.
          </Typography.Text>
        </Flex>
      </div>

      <DataTable
        source={makeSource(webhooksQuery.data)}
        columns={[
          { key: 'webhook', header: 'Webhook', sortable: true, sortValue: (row) => row.name, render: (row) => <div><Typography.Text strong>{row.name}</Typography.Text></div> },
          { key: 'endpoint', header: 'Endpoint', render: (row) => <Typography.Text code style={{ fontSize: token.fontSize, color: token.colorTextSecondary, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.url}>{row.url}</Typography.Text> },
          { key: 'events', header: 'Events', render: (row) => (
            <Flex gap={token.marginXS} wrap="wrap">
              {(row.events ?? []).map((e) => <StatusPill key={e} variant="slate">{e}</StatusPill>)}
            </Flex>
          )},
          { key: 'status', header: 'Status', render: (row) => <StatusPill variant={row.active ? 'teal' : 'amber'}>{row.active ? 'Active' : 'Disabled'}</StatusPill> },
        ]}
        rowKey={(row) => row.id}
        emptyText="No webhooks configured."
        isLoading={webhooksQuery.isLoading}
        searchable
        searchPlaceholder="Search webhooks..."
        searchValue={params.search}
        onSearchChange={setSearch}
        filters={[{ key: 'active', label: 'Status', placeholder: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }] }]}
        filterValues={params.filters}
        onFilterChange={setFilter}
        actions={[
          { label: 'History', icon: <FaIcon icon="fa-clock-rotate-left" />, onClick: (row) => setHistoryOpen(row) },
          { label: 'Test', icon: <FaIcon icon="fa-paper-plane" />, onClick: (row) => {
            testMutation.mutate(row.id, {
              onSuccess: (result) => { message.success(result.success ? `Test delivered to ${row.name}` : `Test failed — ${row.name} returned ${result.status}`); },
              onError: (err) => message.error(errorMessage(err)),
            });
          } },
          { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (row) => setEditOpen(row) },
          { label: 'Disable', icon: <FaIcon icon="fa-toggle-off" />, onClick: (row) => { updateMutation.mutate({ id: row.id, data: { active: !row.active } }, { onSuccess: () => message.success(`${row.name} disabled`), onError: (err) => message.error(errorMessage(err)) }); }, show: (row) => row.active },
          { label: 'Enable', icon: <FaIcon icon="fa-toggle-on" />, onClick: (row) => { updateMutation.mutate({ id: row.id, data: { active: !row.active } }, { onSuccess: () => message.success(`${row.name} enabled`), onError: (err) => message.error(errorMessage(err)) }); }, show: (row) => !row.active },
          { label: 'Delete', icon: <FaIcon icon="fa-trash" />, variant: 'danger', onClick: (row) => { confirm({ title: `Delete "${row.name}"?`, content: 'This webhook will stop receiving events.', okText: 'Delete', danger: true, onOk: () => deleteMutation.mutate(row.id, { onSuccess: () => message.success(`${row.name} deleted`), onError: (err) => message.error(errorMessage(err)) }) }); } },
        ]}
        onChange={(p, ps) => setPagination(p, ps)}
      />

      {/* Delivery history drawer */}
      <Drawer title={`${historyOpen?.name ?? ''} — Delivery History`} open={!!historyOpen} onClose={() => setHistoryOpen(null)} size="large">
        {historyOpen ? (
          <WebhookDeliveryHistory webhookId={historyOpen.id} />
        ) : (
          <Flex vertical align="center" style={{ color: token.colorTextSecondary, padding: token.paddingXL }}>
            No deliveries yet.
          </Flex>
        )}
      </Drawer>

      {/* Create webhook modal */}
      <WebhookFormModal
        open={createOpen}
        mode="create"
        onSubmit={(values) => {
          createMutation.mutate({ ...values, active: true }, {
            onSuccess: () => { setCreateOpen(false); message.success('Webhook created'); },
            onError: (err) => message.error(errorMessage(err)),
          });
        }}
        onCancel={() => setCreateOpen(false)}
        loading={createMutation.isPending}
      />

      {/* Edit webhook modal */}
      <WebhookFormModal
        open={!!editOpen}
        mode="edit"
        initialValues={editOpen ? { name: editOpen.name, url: editOpen.url, events: editOpen.events ?? [] } : undefined}
        onSubmit={(values) => {
          if (editOpen) {
            updateMutation.mutate({ id: editOpen.id, data: values }, {
              onSuccess: () => { setEditOpen(null); message.success('Webhook updated'); },
              onError: (err) => message.error(errorMessage(err)),
            });
          }
        }}
        onCancel={() => setEditOpen(null)}
        loading={updateMutation.isPending}
      />
    </Flex>
    </PermissionGate>
  );
}

function WebhookDeliveryHistory({ webhookId }: { webhookId: string }) {
  const { token } = theme.useToken();
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';

  const query = useQuery({
    queryKey: ['webhook-deliveries', webhookId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/deliveries`, {
        headers: { Authorization: `Bearer ${window.__accessToken}` },
      });
      const json = await res.json();
      return json.data as Array<{ id: string; event: string; status: string; responseStatus: number | null; durationMs: number | null; createdAt: string }>;
    },
    enabled: !!workspaceId && !!webhookId,
  });

  if (query.isLoading) return <LoadingState text="Loading deliveries..." />;
  if (query.error) return <ErrorBanner message="Failed to load deliveries" />;
  if (!query.data?.length) return <Flex vertical align="center" style={{ color: token.colorTextSecondary, padding: token.paddingXL }}>No deliveries yet.</Flex>;

  return (
    <DataTable
      source={{ data: query.data, meta: { page: 1, pageSize: 10, total: query.data.length } }}
      rowKey={(row) => row.id}
      columns={[
        { key: 'event', header: 'Event', render: (row) => <Tag>{row.event}</Tag> },
        { key: 'status', header: 'Status', render: (row) => <StatusPill variant={row.status === WEBHOOK_STATUS.SUCCESS ? 'teal' : row.status === WEBHOOK_STATUS.FAILED ? 'red' : 'amber'}>{row.status}</StatusPill> },
        { key: 'responseStatus', header: 'HTTP', render: (row) => row.responseStatus ?? '—' },
        { key: 'durationMs', header: 'Duration', render: (row) => row.durationMs ? `${row.durationMs}ms` : '—' },
        { key: 'createdAt', header: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
      ]}
    />
  );
}
