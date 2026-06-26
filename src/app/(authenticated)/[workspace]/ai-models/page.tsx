'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, App, Typography, Flex, theme, Tag } from 'antd';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { MODEL_ROLE } from '@/commons/constants/layout';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useAiModelsQuery, useCreateAiModelMutation, useUpdateAiModelMutation, useDeleteAiModelMutation, useTestAiModelMutation } from '@/modules/ai-models';
import type { CreateAiModelInput } from '@/commons/schemas/ai-model.schema';
import type { AiModelRow } from '@/commons/types/ai-models';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { AddModelModal, EditModelModal, FallbackChainCard, VerificationSettingsCard } from '@/features/model';

const PROVIDER_ICONS: Record<string, string> = {
  openai: 'fa-brands fa-openai',
  anthropic: 'fa-brands fa-anthropic',
  ollama: 'fa-server',
  groq: 'fa-bolt',
  modal: 'fa-cube',
  'openai-compatible': 'fa-plug',
};

function buildColumns(token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<AiModelRow>[] {
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
      render: (row) => (
        <Flex align="center" gap={token.marginXS}>
          <FaIcon icon={PROVIDER_ICONS[row.provider] ?? 'fa-circle-question'} style={{ width: token.size, color: token.colorTextSecondary }} />
          <Typography.Text type="secondary">{row.provider}</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <span style={{ color: row.status === 'reachable' ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>{row.status}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <span>{row.role}</span>,
    },
    {
      key: 'promptPreset',
      header: 'Profile',
      render: (row) => <Tag>{row.promptPreset}</Tag>,
    },
    {
      key: 'lastTestedAt',
      header: 'Last Tested',
      render: (row) => <Typography.Text type="secondary">{row.lastTestedAt ? new Date(row.lastTestedAt).toLocaleDateString() : 'Never'}</Typography.Text>,
    },
  ];
}

export default function AiModelsPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.AI_MODELS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="AI Models" description="Manage AI models for vulnerability analysis and false positive reduction." />
          <ComingSoonCard
            icon="fa-robot"
            title="AI Models"
            description="AI models allow you to configure LLM providers for vulnerability analysis."
            envHint="FEATURE_FLAG_AI_MODELS"
          />
        </Flex>
      }
    >
      <AiModelsPageContent />
    </FeatureGate>
  );
}

function AiModelsPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canManage = has(PERMISSION.AI_MODEL_MANAGE);

  const { params, setPagination, setSearch } = useTableParams({
    defaultPageSize: 10,
  });

  const modelsQuery = useAiModelsQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
  });
  const createMutation = useCreateAiModelMutation();
  const updateMutation = useUpdateAiModelMutation();
  const deleteMutation = useDeleteAiModelMutation();
  const testMutation = useTestAiModelMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModelRow | null>(null);

  const models = modelsQuery.data?.data ?? [];

  const handleTestAll = () => {
    if (models.length === 0) {
      message.warning('No models configured');
      return;
    }
    let tested = 0;
    models.forEach((model) => {
      testMutation.mutate(model.id, {
        onSuccess: (data) => {
          tested++;
          if (tested === models.length) {
            message.success(`All ${models.length} models tested`);
            modelsQuery.refetch();
          }
        },
        onError: () => {
          tested++;
          if (tested === models.length) {
            message.warning('Some models failed — check status column');
            modelsQuery.refetch();
          }
        },
      });
    });
  };

  const handleEdit = useCallback((model: AiModelRow) => {
    setSelectedModel(model);
    setEditOpen(true);
  }, []);

  const handleSaveEdit = (values: Record<string, unknown>) => {
    if (!selectedModel) return;
    updateMutation.mutate(
      { id: selectedModel.id, data: values as Partial<CreateAiModelInput> },
      {
        onSuccess: () => {
          setEditOpen(false);
          setSelectedModel(null);
          message.success('AI model updated');
          modelsQuery.refetch();
        },
        onError: (err) => {
          message.error(errorMessage(err));
        },
      },
    );
  };

  const handleSaveAdd = (values: Record<string, unknown>) => {
    createMutation.mutate(values as CreateAiModelInput, {
      onSuccess: () => {
        setAddOpen(false);
        message.success('AI model added');
        modelsQuery.refetch();
      },
      onError: (err) => {
        message.error(errorMessage(err));
      },
    });
  };

  const handleDelete = useCallback((model: AiModelRow) => {
    confirm({
      title: 'Delete AI model',
      content: `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
      danger: true,
      onOk: () => {
        deleteMutation.mutate(model.id, {
          onSuccess: () => { message.success('AI model deleted'); modelsQuery.refetch(); },
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  }, [confirm, deleteMutation, message, modelsQuery]);

  const handleTest = useCallback((model: AiModelRow) => {
    testMutation.mutate(model.id, {
      onSuccess: (data) => {
        message.success(`${model.name} is ${data?.status ?? 'unknown'}`);
        modelsQuery.refetch();
      },
      onError: () => {
        message.error(`${model.name} is unreachable`);
      },
    });
  }, [testMutation, message, modelsQuery]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const modelA = models[index];
    const modelB = models[index - 1];
    if (!modelA || !modelB) return;
    // Swap priorities AND roles to keep them in sync
    Promise.all([
      updateMutation.mutateAsync({ id: modelA.id, data: { priority: modelB.priority, role: index === 1 ? MODEL_ROLE.PRIMARY : MODEL_ROLE.FALLBACK } as Partial<CreateAiModelInput> }),
      updateMutation.mutateAsync({ id: modelB.id, data: { priority: modelA.priority, role: MODEL_ROLE.FALLBACK } as Partial<CreateAiModelInput> }),
    ]).then(() => modelsQuery.refetch());
  };

  const moveDown = (index: number) => {
    if (index >= models.length - 1) return;
    const modelA = models[index];
    const modelB = models[index + 1];
    if (!modelA || !modelB) return;
    // Swap priorities AND roles to keep them in sync
    Promise.all([
      updateMutation.mutateAsync({ id: modelA.id, data: { priority: modelB.priority, role: MODEL_ROLE.FALLBACK } as Partial<CreateAiModelInput> }),
      updateMutation.mutateAsync({ id: modelB.id, data: { priority: modelA.priority, role: index === 0 ? MODEL_ROLE.PRIMARY : MODEL_ROLE.FALLBACK } as Partial<CreateAiModelInput> }),
    ]).then(() => modelsQuery.refetch());
  };

  const setActive = (modelId: string) => {
    const currentPrimary = models.find((m) => m.role === MODEL_ROLE.PRIMARY);
    const targetModel = models.find((m) => m.id === modelId);
    if (!targetModel) return;

    // Set target as primary with lowest priority
    const mutations: Promise<unknown>[] = [
      updateMutation.mutateAsync({ id: modelId, data: { role: MODEL_ROLE.PRIMARY, priority: 1 } as Partial<CreateAiModelInput> }),
    ];

    // Demote old primary to fallback with higher priority
    if (currentPrimary && currentPrimary.id !== modelId) {
      mutations.push(
        updateMutation.mutateAsync({ id: currentPrimary.id, data: { role: MODEL_ROLE.FALLBACK, priority: targetModel.priority } as Partial<CreateAiModelInput> }),
      );
    }

    Promise.all(mutations).then(() => {
      modelsQuery.refetch();
      message.success('Active model updated');
    });
  };

  const columns = useMemo<DataTableColumn<AiModelRow>[]>(() => buildColumns(token), [token]);

  const actions = useMemo<ActionConfig<AiModelRow>[]>(() => [
    { label: 'Test', icon: <FaIcon icon="fa-flask-vial" />, onClick: (model) => handleTest(model), show: () => canManage },
    { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (model) => handleEdit(model), show: () => canManage },
    { label: 'Delete', icon: <FaIcon icon="fa-trash" />, danger: true, onClick: (model) => handleDelete(model), show: () => canManage },
  ], [handleTest, handleEdit, handleDelete, canManage]);

  if (modelsQuery.isLoading) {
    return <LoadingState text="Loading AI models..." />;
  }

  if (modelsQuery.isError) {
    return <ErrorState title="Failed to load AI models" description={errorMessage(modelsQuery.error)} onRetry={() => modelsQuery.refetch()} />;
  }

  return (
    <PermissionGate permission={PERMISSION.AI_MODEL_VIEW} fallback={<PermissionHint permission={PERMISSION.AI_MODEL_VIEW} />}>
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="AI Models"
        description="Manage AI models for vulnerability analysis and false positive reduction."
        actions={
          <Flex gap={token.padding}>
            <PermissionGate permission={PERMISSION.AI_MODEL_MANAGE}>
              <Button onClick={handleTestAll} loading={testMutation.isPending} icon={<FaIcon icon="fa-flask-vial" />}>Test all</Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSION.AI_MODEL_MANAGE}>
              <Button type="primary" onClick={() => setAddOpen(true)} icon={<FaIcon icon="fa-plus" />}>Add model</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <DataTable
        source={makeSource(modelsQuery.data)}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
        emptyText="No models configured."
        isLoading={modelsQuery.isLoading}
        searchable
        searchPlaceholder="Search models"
        searchValue={params.search}
        onSearchChange={setSearch}
        onChange={(p, ps) => setPagination(p, ps)}
      />

      <VerificationSettingsCard />

      <FallbackChainCard
        models={models}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onSetActive={setActive}
        onAddFallback={() => setAddOpen(true)}
        canManage={canManage}
      />

      <EditModelModal open={editOpen} model={selectedModel} onClose={() => { setEditOpen(false); setSelectedModel(null); }} onSave={handleSaveEdit} />
      <AddModelModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveAdd} />
    </Flex>
    </PermissionGate>
  );
}
