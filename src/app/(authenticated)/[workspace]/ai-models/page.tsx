'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, App, Typography, Flex, theme, Tag } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { FaIcon } from '@/commons/components/FaIcon';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';

import { EditModelModal, AddModelModal } from '@/features/model/ModelModals';
import { FallbackChainCard } from '@/features/model/FallbackChainCard';
import { VerificationSettingsCard } from '@/features/model/VerificationSettingsCard';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useAiModelsQuery, useCreateAiModelMutation, useUpdateAiModelMutation, useDeleteAiModelMutation, useTestAiModelMutation } from '@/modules/ai-models';
import type { CreateAiModelInput } from '@/commons/schemas/ai-model.schema';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { errorMessage } from '@/lib/api/errors';
import type { AiModelRow } from '@/commons/types/ai-models';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

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
          <FaIcon icon={PROVIDER_ICONS[row.provider] ?? 'fa-circle-question'} style={{ width: 16, color: token.colorTextSecondary }} />
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

  const handleTestPrimary = () => {
    const primary = models.find((m) => m.role === 'primary');
    if (!primary) {
      message.warning('No primary model configured');
      return;
    }
    testMutation.mutate(primary.id, {
      onSuccess: (data) => {
        message.success(`Primary model is ${data?.status ?? 'unknown'}`);
      },
      onError: (err) => {
        message.error(errorMessage(err));
      },
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
          onSuccess: () => message.success('AI model deleted'),
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  }, [confirm, deleteMutation, message]);

  const handleTest = useCallback((model: AiModelRow) => {
    testMutation.mutate(model.id, {
      onSuccess: (data) => {
        message.success(`${model.name} is ${data?.status ?? 'unknown'}`);
      },
      onError: () => {
        message.error(`${model.name} is unreachable`);
      },
    });
  }, [testMutation, message]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const modelA = models[index];
    const modelB = models[index - 1];
    if (!modelA || !modelB) return;
    // Swap priorities AND roles to keep them in sync
    Promise.all([
      updateMutation.mutateAsync({ id: modelA.id, data: { priority: modelB.priority, role: index === 1 ? 'primary' : 'fallback' } as Partial<CreateAiModelInput> }),
      updateMutation.mutateAsync({ id: modelB.id, data: { priority: modelA.priority, role: 'fallback' } as Partial<CreateAiModelInput> }),
    ]).then(() => modelsQuery.refetch());
  };

  const moveDown = (index: number) => {
    if (index >= models.length - 1) return;
    const modelA = models[index];
    const modelB = models[index + 1];
    if (!modelA || !modelB) return;
    // Swap priorities AND roles to keep them in sync
    Promise.all([
      updateMutation.mutateAsync({ id: modelA.id, data: { priority: modelB.priority, role: 'fallback' } as Partial<CreateAiModelInput> }),
      updateMutation.mutateAsync({ id: modelB.id, data: { priority: modelA.priority, role: index === 0 ? 'primary' : 'fallback' } as Partial<CreateAiModelInput> }),
    ]).then(() => modelsQuery.refetch());
  };

  const setActive = (modelId: string) => {
    const currentPrimary = models.find((m) => m.role === 'primary');
    const targetModel = models.find((m) => m.id === modelId);
    if (!targetModel) return;

    // Set target as primary with lowest priority
    const mutations: Promise<unknown>[] = [
      updateMutation.mutateAsync({ id: modelId, data: { role: 'primary', priority: 1 } as Partial<CreateAiModelInput> }),
    ];

    // Demote old primary to fallback with higher priority
    if (currentPrimary && currentPrimary.id !== modelId) {
      mutations.push(
        updateMutation.mutateAsync({ id: currentPrimary.id, data: { role: 'fallback', priority: targetModel.priority } as Partial<CreateAiModelInput> }),
      );
    }

    Promise.all(mutations).then(() => {
      modelsQuery.refetch();
      message.success('Active model updated');
    });
  };

  const columns = useMemo<DataTableColumn<AiModelRow>[]>(() => buildColumns(token), [token]);

  const actions = useMemo<ActionConfig<AiModelRow>[]>(() => [
    { label: 'Test', icon: <FaIcon icon="fa-flask-vial" />, onClick: (model) => handleTest(model) },
    { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (model) => handleEdit(model) },
    { label: 'Delete', icon: <FaIcon icon="fa-trash" />, danger: true, onClick: (model) => handleDelete(model) },
  ], [handleTest, handleEdit, handleDelete]);

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
              <Button onClick={handleTestPrimary} loading={testMutation.isPending} icon={<FaIcon icon="fa-flask-vial" />}>Test primary</Button>
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
      />

      <EditModelModal open={editOpen} model={selectedModel} onClose={() => { setEditOpen(false); setSelectedModel(null); }} onSave={handleSaveEdit} />
      <AddModelModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveAdd} />
    </Flex>
  );
}
