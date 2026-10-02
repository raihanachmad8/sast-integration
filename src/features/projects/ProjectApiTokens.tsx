'use client';

import { useState } from 'react';
import { App, Alert, Button, Input, Modal, Typography, Table, Tag, Form, Flex, theme } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaIcon } from '@/components/shared/fa-icon';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useApiTokensQuery, useCreateApiTokenMutation, useRevokeApiTokenMutation } from '@/modules/project/queries';
import { createApiTokenSchema, type CreateApiTokenInput } from '@/commons/schemas';
import type { ApiToken } from '@/modules/project/api-tokens';
import type { ColumnsType } from 'antd/es/table';
import { formatDate } from '@/lib/utils/formatDate';


interface ProjectApiTokensProps {
  workspaceId: string;
  projectId: string;
}

export function ProjectApiTokens({ workspaceId, projectId }: ProjectApiTokensProps) {
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast('manager');

  const tokensQuery = useApiTokensQuery(workspaceId, projectId);
  const createMutation = useCreateApiTokenMutation(workspaceId, projectId);
  const revokeMutation = useRevokeApiTokenMutation(workspaceId, projectId);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<{ name: string; rawValue: string } | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateApiTokenInput>({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: { name: '' },
  });

  const tokens = (tokensQuery.data?.tokens ?? []).filter((t) => !t.revokedAt);

  const handleCreate = (values: CreateApiTokenInput) => {
    createMutation.mutate(
      { name: values.name.trim() },
      {
        onSuccess: (result) => {
          setCreatedToken({ name: result.token.name, rawValue: result.rawValue });
          reset();
          setCreateModalOpen(false);
        },
      },
    );
  };

  const handleRevoke = (t: ApiToken) => {
    modal.confirm({
      title: 'Revoke this token?',
      content: `"${t.name}" will be immediately revoked. Any CI pipelines using this token will stop working.`,
      okText: 'Revoke',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => revokeMutation.mutate(t.id),
    });
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken.rawValue);
      message.success('Token copied to clipboard');
    }
  };

  const columns: ColumnsType<ApiToken> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_, t) => (
        <div>
          <Typography.Text strong>{t.name}</Typography.Text>
          <div><Typography.Text type="secondary" code style={{ fontSize: token.fontSizeSM }}>{t.prefix}****</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, t) => (
        <Tag color={t.revokedAt ? 'default' : 'success'}>
          {t.revokedAt ? 'Revoked' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'created',
      render: (_, t) => <Typography.Text type="secondary">{formatDate(t.createdAt)}</Typography.Text>,
    },
    {
      title: 'Last used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsed',
      render: (_, t) => <Typography.Text type="secondary">{t.lastUsedAt ? formatDate(t.lastUsedAt) : '—'}</Typography.Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, t) =>
        canManage && !t.revokedAt ? (
          <Button size="small" danger onClick={() => handleRevoke(t)}>
            <FaIcon icon="fa-xmark" /> Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <Flex vertical gap={token.paddingXL}>
      <Flex justify="space-between" align="center">
        <div>
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>API Tokens</Typography.Title>
          <Typography.Text type="secondary">Manage CI tokens for the upload endpoint. Tokens authenticate pipeline uploads.</Typography.Text>
        </div>
        {canManage && (
          <Button type="primary" onClick={() => setCreateModalOpen(true)}>
            <FaIcon icon="fa-plus" /> Create token
          </Button>
        )}
      </Flex>

      {tokensQuery.isLoading ? (
        <LoadingState text="Loading tokens..." />
      ) : tokens.length === 0 ? (
        <EmptyState
          icon="fa-key"
          title="No API tokens"
          text="Create a token to authenticate CI pipeline uploads."
        />
      ) : (
        <Table
          columns={columns}
          dataSource={tokens}
          rowKey={(t) => t.id}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
        />
      )}

      <Modal
        title="Create API token"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); reset(); }}
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
                value={createdToken?.rawValue ?? ''}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM, backgroundColor: token.colorBgLayout }}
              />
              <Button onClick={handleCopyToken} icon={<FaIcon icon="fa-copy" />}>
                Copy
              </Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
    </Flex>
  );
}
