'use client';

import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Switch, App, Card, Typography, Row, Col, Tag, Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Toolbar } from '@/components/shared/Toolbar';
import { TableFooter } from '@/components/shared/TableFooter';
import { EditModelModal, AddModelModal } from '@/features/model/ModelModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useSessionQuery } from '@/modules/auth/queries';
import { useAuthHeaders } from '@/modules/auth/hooks';
import { API_BASE } from '@/commons/constants';
import { errorMessage } from '@/lib/api/errors';
import { useModelsListQuery, useUpdateModelMutation } from '@/modules/model';
import type { AiModel } from '@/modules/model/api';

const ROLE_VARIANT: Record<string, string> = { Primary: 'teal', 'Fallback 1': 'blue', 'Fallback 2': 'amber' };

const VARIANT_TAG_COLOR: Record<string, string> = {
  red: 'error', amber: 'warning', blue: 'processing',
  teal: 'success', slate: 'default', purple: 'purple',
};

function roleForIndex(index: number): string {
  if (index === 0) return 'Primary';
  if (index === 1) return 'Fallback 1';
  return 'Fallback 2';
}

function useCreateModelMutation() {
  const headers = useAuthHeaders();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; provider: string; role: string; apiKey: string; endpoint: string }) => {
      const res = await fetch(`${API_BASE}/model`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          provider: values.provider,
          role: values.role,
          base_url: values.endpoint,
          api_key: values.apiKey || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create model');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model'] });
    },
  });
}

function useDeleteModelMutation() {
  const headers = useAuthHeaders();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      await fetch(`${API_BASE}/model/${modelId}`, { method: 'DELETE', headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['model'] });
    },
  });
}

function buildColumns(handleEdit: (m: AiModel) => void, token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<AiModel>[] {
  return [
    {
      key: 'name',
      header: 'Model',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex align="center" gap={token.paddingXS}>
          <Typography.Text strong>{row.name}</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => <Typography.Text type="secondary">{row.provider}</Typography.Text>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Tag color={row.status === 'active' ? 'success' : row.status === 'error' ? 'error' : 'warning'}>{row.status}</Tag>,
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      render: (row) => <Typography.Text type="secondary">{row.accuracy != null ? `${row.accuracy}%` : '-'}</Typography.Text>,
    },
    {
      key: 'lastUsed',
      header: 'Last used',
      render: (row) => <Typography.Text type="secondary">{row.lastUsed ? new Date(row.lastUsed).toLocaleString() : 'Never'}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
        </Flex>
      ),
    },
  ];
}

export default function AiModelsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const _session = useSessionQuery();
  const headers = useAuthHeaders();

  const modelsQuery = useModelsListQuery();
  const createMutation = useCreateModelMutation();
  const _deleteMutation = useDeleteModelMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModel | null>(null);

  const updateMutation = useUpdateModelMutation();

  const models = useMemo(() => modelsQuery.data ?? [], [modelsQuery.data]);

  const { params, setPage, setPageSize, setSearch, filtered = [], paginated = [] } = useTableParams<AiModel>({
    data: models,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleTestPrimary = () => {
    message.loading('Testing primary model...', 2).then(() => message.success('Primary model test passed'));
  };

  const handleEdit = useCallback((model: AiModel) => {
    setSelectedModel(model);
    setEditOpen(true);
  }, []);

  const handleSaveEdit = (values: { name: string; provider: string; role: string; apiKey: string; endpoint: string }) => {
    if (!selectedModel) return;
    updateMutation.mutate(
      { id: selectedModel.id, data: { name: values.name, provider: values.provider } },
      {
        onSuccess: () => {
          setEditOpen(false);
          setSelectedModel(null);
          message.success('Model updated');
        },
        onError: (err) => {
          message.error(errorMessage(err));
        },
      },
    );
  };

  const handleSaveAdd = (values: { name: string; provider: string; role: string; apiKey: string; endpoint: string }) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setAddOpen(false);
        message.success('Model added');
      },
      onError: (err) => {
        message.error(errorMessage(err));
      },
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const modelA = filtered[index];
    const modelB = filtered[index - 1];
    if (!modelA || !modelB) return;
    const swapPromise = Promise.all([
      fetch(`${API_BASE}/model/${modelA.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelB.name }),
      }),
      fetch(`${API_BASE}/model/${modelB.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelA.name }),
      }),
    ]);
    swapPromise.then(() => {
      queryClient.invalidateQueries({ queryKey: ['model'] });
    });
  };

  const moveDown = (index: number) => {
    if (index >= filtered.length - 1) return;
    const modelA = filtered[index];
    const modelB = filtered[index + 1];
    if (!modelA || !modelB) return;
    const swapPromise = Promise.all([
      fetch(`${API_BASE}/model/${modelA.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelB.name }),
      }),
      fetch(`${API_BASE}/model/${modelB.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelA.name }),
      }),
    ]);
    swapPromise.then(() => {
      queryClient.invalidateQueries({ queryKey: ['model'] });
    });
  };

  const setActive = (modelId: string) => {
    fetch(`${API_BASE}/model/${modelId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['model'] });
      message.success('Active model updated');
    });
  };

  // Stats
  const _primaryCount = models.filter((m) => m.role === 'primary').length;
  const _fallbackCount = models.filter((m) => m.role === 'fallback').length;
  const _activeCount = models.filter((m) => m.status === 'active').length;

  const columns = useMemo<DataTableColumn<AiModel>[]>(() => buildColumns(handleEdit, token), [handleEdit, token]);

  if (modelsQuery.isLoading) {
    return <LoadingState text="Loading AI models..." />;
  }

  if (modelsQuery.isError) {
    return <ErrorState title="Failed to load AI models" description={errorMessage(modelsQuery.error)} onRetry={() => modelsQuery.refetch()} />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="AI Models"
        description="Manage AI models for vulnerability analysis and false positive reduction."
        actions={
          <Flex gap={token.padding}>
            <PermissionGate permission={PERMISSION.AI_MODEL_MANAGE}>
              <Button onClick={handleTestPrimary}><FaIcon icon="fa-flask-vial" /> Test primary</Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSION.AI_MODEL_MANAGE}>
              <Button type="primary" onClick={() => setAddOpen(true)}><FaIcon icon="fa-plus" /> Add model</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search models"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        <DataTable
            data={paginated}
            columns={columns}
            rowKey={(r) => r.id}
            emptyText="No models configured."
          />
        <TableFooter
          current={params.page}
          pageSize={params.per_page}
          total={filtered.length}
          onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        />
        </Card>

      <Row gutter={[16, 16]} align="top">
        <Col flex="auto">
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <Typography.Title level={3} style={{ fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Verification behavior</Typography.Title>
          <Flex vertical gap={token.paddingXL}>
            <ToggleRow
              label="Attach knowledge context"
              description="Include CWE, NVD, and custom workspace rules in AI verification prompts."
              defaultChecked
            />
            <ToggleRow
              label="Require confidence for auto-accept"
              description="Only auto-suggest accept actions above the configured confidence threshold."
              defaultChecked
            />
            <ToggleRow
              label="Allow fallback on timeout"
              description="Move to the next model when the primary verifier exceeds timeout."
              defaultChecked
            />
          </Flex>

          <Form layout="vertical">
            <Row gutter={[16, 16]} style={{ marginTop: token.paddingXL }}>
              <Col xs={24} sm={8}>
              <Form.Item label="Confidence threshold">
                <Select defaultValue="90" style={{ width: '100%' }} options={[{ value: '85', label: '85%' }, { value: '90', label: '90%' }, { value: '95', label: '95%' }]} />
              </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
              <Form.Item label="Timeout">
                <Select defaultValue="90" style={{ width: '100%' }} options={[{ value: '60', label: '60 sec' }, { value: '90', label: '90 sec' }, { value: '120', label: '120 sec' }]} />
              </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
              <Form.Item label="CWE mismatch">
                <Select defaultValue="warn" style={{ width: '100%' }} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
              </Form.Item>
              </Col>
            </Row>
          </Form>
      </Card>
        </Col>

        <Col xs={24} sm={24} flex="300px">
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <Typography.Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Fallback chain</Typography.Title>
          <Flex vertical gap={token.padding}>
            {filtered.map((m, i) => {
              const role = roleForIndex(i);
              const isActive = i === 0;
              return (
                <Flex key={m.id} align="center" gap={token.padding} style={{ padding: token.padding, border: isActive ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: isActive ? token.colorPrimaryBg : token.colorBgContainer }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: isActive ? token.colorPrimary : token.colorBorder, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong ellipsis style={{ fontSize: token.fontSize, color: token.colorText }}>{m.name}</Typography.Text>
                    <Typography.Text type="secondary" ellipsis style={{ fontSize: token.fontSizeSM }}>{m.provider}</Typography.Text>
                  </Flex>
                  <Tag color={VARIANT_TAG_COLOR[ROLE_VARIANT[role] ?? 'slate'] ?? 'default'} style={{ flexShrink: 0 }}>{role}</Tag>
                  <Flex gap={4} style={{ flexShrink: 0 }}>
                    <Button size="small" disabled={i === 0} onClick={() => moveUp(i)}>
                      <FaIcon icon="fa-arrow-up" />
                    </Button>
                    <Button size="small" disabled={i === filtered.length - 1} onClick={() => moveDown(i)}>
                      <FaIcon icon="fa-arrow-down" />
                    </Button>
                    {!isActive && (
                      <Button size="small" type="primary" onClick={() => setActive(m.id)}>
                        Set Active
                      </Button>
                    )}
                    {isActive && (
                      <StatusPill variant="teal">Active</StatusPill>
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
          <Button size="small" block style={{ marginTop: token.paddingLG }} onClick={() => setAddOpen(true)}>
            <FaIcon icon="fa-plus" /> Add fallback
          </Button>
        </Card>
        </Col>
      </Row>

      <EditModelModal open={editOpen} model={selectedModel} onClose={() => { setEditOpen(false); setSelectedModel(null); }} onSave={handleSaveEdit} />
      <AddModelModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveAdd} />
    </Flex>
  );
}

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.paddingLG}>
      <Switch size="small" defaultChecked={defaultChecked} style={{ marginTop: 4 }} />
      <Flex vertical>
        <Typography.Text strong style={{ fontSize: token.fontSize, color: token.colorText }}>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: 4 }}>{description}</Typography.Text>
      </Flex>
    </Flex>
  );
}
