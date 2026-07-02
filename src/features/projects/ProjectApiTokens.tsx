'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Input, Modal, Typography, Form, Flex, theme } from 'antd';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { useConfirm } from '@/commons/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/commons/components/DataTable';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { PERMISSION } from '@/commons/constants/permissions';
import { createApiTokenSchema, type CreateApiTokenInput } from '@/commons/schemas';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { formatDate } from '@/lib/utils/formatDate';
import { useApiTokensQuery, useCreateApiTokenMutation, useRevokeApiTokenMutation } from '@/modules/api-tokens';
import type { ApiToken } from '@/modules/api-tokens';

interface ProjectApiTokensProps {
  projectId: string;
  /** Whether the create token modal is currently open */
  createModalOpen?: boolean;
  /** Callback when the create token modal should close */
  onCloseCreate?: () => void;
  /** Callback to open the create token modal from parent */
  onOpenCreate?: () => void;
}

/**
 * API token management panel for a project — list, create, and revoke tokens.
 *
 * Provides a paginated table of tokens with creation modal and revoke confirmation.
 *
 * @param props - {@link ProjectApiTokensProps}
 * @returns JSX element rendering the API tokens table and management UI.
 *
 * @example
 * <ProjectApiTokens projectId="proj_123" />
 */
export function ProjectApiTokens({ projectId, createModalOpen: createModalOpenProp, onCloseCreate: onCloseCreateProp, onOpenCreate: _onOpenCreate }: ProjectApiTokensProps) {
  const { confirm } = useConfirm();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast('manager');

  // Support both controlled (parent-managed) and uncontrolled (internal) modal state
  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false);
  const createModalOpen = createModalOpenProp ?? internalCreateModalOpen;
  const onCloseCreate = onCloseCreateProp ?? (() => setInternalCreateModalOpen(false));

  const tokensQuery = useApiTokensQuery(projectId);
  const createMutation = useCreateApiTokenMutation(projectId);
  const revokeMutation = useRevokeApiTokenMutation(projectId);

  const [createdToken, setCreatedToken] = useState<{ name: string; rawToken: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateApiTokenInput>({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: { name: '', permissions: [PERMISSION.SCAN_UPLOAD] },
  });

  const tokens = tokensQuery.data?.data ?? [];

  const { params, setPagination, setSearch, filtered, paginated } = useTableParams({
    data: tokens,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleCreate = (values: CreateApiTokenInput) => {
    createMutation.mutate(
      { name: values.name.trim() },
      {
        onSuccess: (result) => {
          setCreatedToken({ name: result.token.name, rawToken: result.rawToken });
          reset();
          onCloseCreate();
        },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handleRevoke = (t: ApiToken) => {
    confirm({
      title: 'Revoke this token?',
      content: `"${t.name}" will be immediately revoked. Any CI pipelines using this token will stop working.`,
      okText: 'Revoke',
      danger: true,
      cancelText: 'Cancel',
      onOk: () => revokeMutation.mutate(t.id, {
        onSuccess: () => message.success(`Token "${t.name}" revoked`),
        onError: (err) => message.error(errorMessage(err)),
      }),
    });
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken.rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const columns: DataTableColumn<ApiToken>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (t) => t.name,
      render: (t) => (
        <div>
          <Typography.Text strong>{t.name}</Typography.Text>
          <div><Typography.Text type="secondary" code style={{ fontSize: token.fontSizeSM }}>{t.prefix}****</Typography.Text></div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <StatusPill variant={t.revokedAt ? 'slate' : 'teal'}>
          {t.revokedAt ? 'Revoked' : 'Active'}
        </StatusPill>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (t) => <Typography.Text type="secondary">{formatDate(t.createdAt)}</Typography.Text>,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      render: (t) => <Typography.Text type="secondary">{t.lastUsedAt ? formatDate(t.lastUsedAt) : '—'}</Typography.Text>,
    },
  ];

  const actions = canManage ? [
    {
      label: 'Revoke',
      icon: <FaIcon icon="fa-xmark" />,
      variant: 'danger' as const,
      show: (t: ApiToken) => !t.revokedAt,
      onClick: handleRevoke,
    },
  ] : [];

  return (
    <Flex vertical gap={token.paddingXL}>
      <PermissionGate
        permission={PERMISSION.PROJECT_MANAGE}
        fallback={
          <PermissionHint permission={PERMISSION.PROJECT_MANAGE} message="API tokens are used for CI/CD integrations. You need Manager or Owner role to manage them." />
        }
      >

        {tokensQuery.isLoading ? (
          <LoadingState text="Loading tokens..." />
        ) : tokensQuery.isError ? (
          <div style={{ textAlign: 'center', padding: token.paddingXL }}>
            <Typography.Text type="secondary">Failed to load tokens.</Typography.Text>
          </div>
        ) : (
          <DataTable
            source={{ data: paginated ?? [], meta: { page: params.page, pageSize: params.perPage, total: filtered?.length ?? 0 } }}
            columns={columns}
            rowKey={(t) => t.id}
            actions={actions}
            actionsVariant="inline"
            compact
            searchable
            searchPlaceholder="Search tokens..."
            searchValue={params.search}
            onSearchChange={setSearch}
            onChange={(p, ps) => setPagination(p, ps)}
            emptyText="No API tokens"
          />
        )}
      </PermissionGate>

      <Modal
        title="Create API token"
        open={createModalOpen}
        onCancel={() => { onCloseCreate(); reset(); }}
        onOk={handleSubmit(handleCreate)}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form layout="vertical" onFinish={handleSubmit(handleCreate)}>
          <Form.Item
            label="Token name"
            required
            validateStatus={errors.name ? 'error' : undefined}
            help={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="e.g. CI Pipeline — main branch" onPressEnter={handleSubmit(handleCreate)} />
              )}
            />
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: 4, display: 'block' }}>
              A descriptive name to identify this token in usage logs.
            </Typography.Text>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Token created"
        open={!!createdToken}
        onCancel={() => setCreatedToken(null)}
        footer={
          <Button type="primary" onClick={() => setCreatedToken(null)}>
            I have saved the token
          </Button>
        }
      >
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingLG} 0` }}>
          <Alert
            type="warning"
            showIcon
            icon={<FaIcon icon="fa-triangle-exclamation" />}
            title="Store this token securely"
            description="This token will not be shown again. Copy it now and store in a secure location (e.g. CI secrets)."
            style={{ marginBottom: token.marginMD }}
          />

          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: token.paddingXS, fontSize: token.fontSizeSM }}>{createdToken?.name}</Typography.Text>
            <Flex gap={token.paddingSM}>
              <Input
                value={createdToken?.rawToken ?? ''}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM, backgroundColor: token.colorBgLayout }}
              />
              <Button onClick={handleCopyToken} icon={<FaIcon icon={copied ? "fa-check" : "fa-copy"} />} type={copied ? "primary" : "default"}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
    </Flex>
  );
}
