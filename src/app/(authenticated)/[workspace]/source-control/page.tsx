'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select, Card, Switch, Typography, App, Form, Flex, Dropdown, Grid, Avatar, theme } from 'antd';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { errorMessage } from '@/lib/api/errors';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlag';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { usePrReviewSettingsQuery, useUpdatePrReviewSettingsMutation } from '@/modules/workspace-settings';
import { useSourceControlProvidersQuery, useSourceControlReposQuery, useDeleteSourceControlMutation, useAddSourceControlProviderMutation, useUpdateSourceControlMutation, useSyncProviderMutation, useImportRepositoryMutation, useUninstallRepositoryMutation, useTestSourceControlMutation } from '@/modules/source-control';
import { useSessionData } from '@/modules/auth/queries';
import { ConfigureProviderModal, ImportRepoModal, SyncResultsModal } from '@/features/source-control/SourceControlModals';
import { SetupGuideDrawer } from '@/features/source-control/SetupGuideDrawer';

interface ScmProvider {
  id: string;
  name: string;
  icon: string;
  mode: string;
  modeDetail: string;
  status: 'Connected' | 'Pending' | 'Disconnected';
  org: string;
  repos: number;
  imported: number;
  credentials?: Record<string, unknown>;
}

const PROVIDER_ICONS: Record<string, string> = {
  github: 'fa-brands fa-github',
  gitlab: 'fa-brands fa-gitlab',
  gitea: 'fa-solid fa-code-fork',
};

const PROVIDER_MENU_ITEMS = [
  { key: 'github', label: 'GitHub', icon: <FaIcon icon="fa-brands fa-github" /> },
  { key: 'gitlab', label: 'GitLab', icon: <FaIcon icon="fa-brands fa-gitlab" /> },
  { key: 'gitea', label: 'Gitea', icon: <FaIcon icon="fa-solid fa-code-fork" /> },
];

const STATUS_OPTIONS = [
  { value: 'imported', label: 'Imported' },
  { value: 'available', label: 'Available' },
];

function deriveStatus(credentials: Record<string, unknown> | undefined, mode: string): 'Connected' | 'Pending' | 'Disconnected' {
  if (!credentials) return 'Disconnected';
  const c = credentials;
  if (mode === 'oauth-app') {
    return (c.clientId && c.clientSecret) ? 'Connected' : (c.clientId ? 'Pending' : 'Disconnected');
  }
  if (mode === 'pat') {
    return c.token ? 'Connected' : 'Disconnected';
  }
  if (mode === 'github-app') {
    return (c.appId && c.privateKey && c.installationId) ? 'Connected' : (c.appId ? 'Pending' : 'Disconnected');
  }
  return 'Disconnected';
}

function mapApiProviderToScmProvider(apiProvider: { id: string; name: string; type?: string; status?: string; mode?: string; org?: string; discovered?: number; imported?: number; credentials?: Record<string, unknown> }): ScmProvider {
  const creds = apiProvider.credentials as Record<string, unknown> | undefined;
  const mode = (creds?.mode as string) ?? apiProvider.mode ?? 'oauth-app';
  return {
    id: apiProvider.id,
    name: apiProvider.name,
    icon: PROVIDER_ICONS[apiProvider.type ?? ''] ?? 'fa-solid fa-code',
    mode: apiProvider.type ?? 'github',
    modeDetail: mode,
    status: deriveStatus(creds, mode),
    org: apiProvider.org ?? '',
    repos: apiProvider.discovered ?? 0,
    imported: apiProvider.imported ?? 0,
    credentials: creds,
  };
}

export default function SourceControlPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const breakpoints = Grid.useBreakpoint();
  const _isMobile = !breakpoints.md;
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const { has } = usePermissions();
  const canManage = has(PERMISSION.INTEGRATION_MANAGE);
  const { flags } = useFeatureFlags([FEATURE_FLAG.SOURCE_CONTROL_GITHUB, FEATURE_FLAG.SOURCE_CONTROL_GITLAB, FEATURE_FLAG.SOURCE_CONTROL_GITEA]);
  const hasScmProvider = flags[FEATURE_FLAG.SOURCE_CONTROL_GITHUB] || flags[FEATURE_FLAG.SOURCE_CONTROL_GITLAB] || flags[FEATURE_FLAG.SOURCE_CONTROL_GITEA];

  const sourceControlsQuery = useSourceControlProvidersQuery();
  const deleteSourceControlMutation = useDeleteSourceControlMutation();
  const addProviderMutation = useAddSourceControlProviderMutation();
  const updateProviderMutation = useUpdateSourceControlMutation();
  const syncProviderMutation = useSyncProviderMutation();
  const importRepositoryMutation = useImportRepositoryMutation();
  const uninstallRepositoryMutation = useUninstallRepositoryMutation();
  const testProviderMutation = useTestSourceControlMutation();
  const prReviewSettingsQuery = usePrReviewSettingsQuery();
  const updatePrReviewSettingsMutation = useUpdatePrReviewSettingsMutation();

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['status'],
    defaultPageSize: 10,
  });

  const firstProviderId = useMemo(() => {
    if (!sourceControlsQuery.data) return '';
    const providers = sourceControlsQuery.data as unknown[];
    return providers.length > 0 ? (providers[0] as { id: string }).id : '';
  }, [sourceControlsQuery.data]);

  const reposQuery = useSourceControlReposQuery(firstProviderId, {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
  });

  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [configureOpen, setConfigureOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncResultsOpen, setSyncResultsOpen] = useState(false);
  const [syncResults, setSyncResults] = useState<{ provider: string; repos: number; imported: number; newWebhooks: number } | null>(null);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedRepoSourceControlId, setSelectedRepoSourceControlId] = useState('');
  const [selectedProviderName, setSelectedProviderName] = useState('');

  const providers = useMemo(() => {
    if (!sourceControlsQuery.data) return [];
    return (sourceControlsQuery.data as unknown[]).map((p) => mapApiProviderToScmProvider(p as { id: string; name: string }));
  }, [sourceControlsQuery.data]);

  const handleSetupGuide = (providerId: string) => {
    setSelectedProvider(providerId);
    setSetupGuideOpen(true);
  };

  const handleConfigure = (providerName: string) => {
    setSelectedProviderName(providerName);
    setConfigureOpen(true);
  };

  const handleConnectFromDrawer = (providerName: string) => {
    setSelectedProviderName(providerName);
    setConfigureOpen(true);
  };

  const handleTest = (providerId: string) => {
    testProviderMutation.mutate(providerId, {
      onSuccess: () => message.success('Connection test passed'),
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleSync = (providerId: string) => {
    syncProviderMutation.mutate(providerId, {
      onSuccess: (results) => {
        setSyncResults(results);
        setSyncResultsOpen(true);
      },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleSyncConnected = () => {
    const allProviderIds = providers.map((p) => p.id);
    if (allProviderIds.length === 0) return;
    allProviderIds.forEach((id) => {
      syncProviderMutation.mutate(id, {
        onSuccess: (results) => {
          setSyncResults(results);
          setSyncResultsOpen(true);
        },
        onError: (err) => message.error(errorMessage(err)),
      });
    });
  };

  const handleDisconnect = (providerId: string) => {
    confirm({
      title: 'Disconnect?',
      content: 'Disconnect this provider?',
      okText: 'Disconnect',
      danger: true,
      onOk: () => deleteSourceControlMutation.mutate(providerId, {
        onSuccess: () => message.success('Provider disconnected'),
        onError: (err) => message.error(errorMessage(err)),
      }),
    });
  };

  const handleDelete = (providerId: string) => {
    confirm({
      title: 'Delete provider?',
      content: 'This will remove the provider connection and all associated data. This action cannot be undone.',
      okText: 'Delete',
      danger: true,
      onOk: () => deleteSourceControlMutation.mutate(providerId, {
        onSuccess: () => message.success('Provider deleted'),
        onError: (err) => message.error(errorMessage(err)),
      }),
    });
  };

  const handleConnectProvider = (providerKey: string) => {
    handleSetupGuide(providerKey);
  };

  const handleImport = (sourceRepositoryId: string, repoFullName: string) => {
    setSelectedRepo(repoFullName);
    setSelectedRepoSourceControlId(sourceRepositoryId);
    setImportOpen(true);
  };

  const handleUninstall = (importId: string | null, repoFullName: string) => {
    if (!importId) return;
    confirm({
      title: 'Uninstall?',
      content: `Uninstall ${repoFullName}? This will remove the webhook from the provider.`,
      okText: 'Uninstall',
      danger: true,
      onOk: () => uninstallRepositoryMutation.mutate(importId, {
        onSuccess: () => message.success(`${repoFullName} uninstalled`),
        onError: () => message.error('Failed to uninstall repository'),
      }),
    });
  };

  if (!workspaceId) {
    return <LoadingState text="Loading workspace..." />;
  }

  if (sourceControlsQuery.isLoading) {
    return <LoadingState text="Loading source control..." />;
  }

  if (sourceControlsQuery.isError) {
    return <ErrorState title="Failed to load source controls" description={errorMessage(sourceControlsQuery.error)} onRetry={() => sourceControlsQuery.refetch()} />;
  }

  if (!hasScmProvider) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Source Control" description="Connect SCM providers, sync provider repository catalogs, then import repositories into internal Projects." />
        <ComingSoonCard
          icon="fa-plug"
          title="Source Control"
          description="Source control integration allows you to connect GitHub, GitLab, or Gitea providers."
          envHint="FEATURE_FLAG_SOURCE_CONTROL_GITHUB"
        />
      </Flex>
    );
  }

  const connectMenuItems = PROVIDER_MENU_ITEMS.map((item) => ({
    ...item,
    onClick: () => handleConnectProvider(item.key),
  }));

  const prReviewItems = [
    { key: 'postPrSummaryComment', title: 'Post PR summary comment', description: 'Create or update one provider comment with issue counts and review summary.', defaultChecked: true },
    { key: 'inlineCodeAnnotations', title: 'Inline code annotations', description: 'Publish detailed finding lines when the provider supports diff mapping.', defaultChecked: true },
    { key: 'publishQualityGateStatus', title: 'Publish quality gate status', description: 'Publish commit status back to the Git provider for branch protection.', defaultChecked: true },
  ];

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Source Control"
        description="Connect SCM providers, sync provider repository catalogs, then import repositories into internal Projects."
        actions={
          <PermissionGate permission={PERMISSION.INTEGRATION_MANAGE}>
            <Flex gap={token.paddingSM}>
              {providers.length > 0 && (
                <Button onClick={handleSyncConnected} loading={syncProviderMutation.isPending} icon={<FaIcon icon="fa-rotate" />}>Sync connected</Button>
              )}
              <Dropdown menu={{ items: connectMenuItems }} trigger={['click']}>
                <Button type="primary" icon={<FaIcon icon="fa-plug" />}>Connect provider</Button>
              </Dropdown>
            </Flex>
          </PermissionGate>
        }
      />

      {providers.length > 0 ? (
        <Card styles={{ body: { padding: 0 } }}>
          <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Providers</div>
          <DataTable
            source={{ data: providers, meta: { page: 1, pageSize: 10, total: providers.length } }}
            columns={[
              { key: 'name', header: 'Provider', render: (row) => (
                <Flex align="center" gap={token.paddingSM}>
                  <Avatar size={32} icon={<FaIcon icon={row.icon} />} style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
                  <Flex vertical>
                    <Typography.Text strong>{row.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.mode}</Typography.Text>
                  </Flex>
                </Flex>
              )},
              { key: 'status', header: 'Status', render: (row) => (
                <StatusPill variant={row.status === 'Connected' ? 'teal' : row.status === 'Pending' ? 'amber' : 'slate'}>{row.status}</StatusPill>
              )},
              { key: 'repos', header: 'Discovered', render: (row) => <Typography.Text>{row.repos}</Typography.Text> },
              { key: 'imported', header: 'Imported', render: (row) => <Typography.Text>{row.imported}</Typography.Text> },
            ]}
            rowKey={(row) => row.id}
            actions={[
              { label: 'Configure', icon: <FaIcon icon="fa-gear" />, onClick: (row) => handleConfigure(row.name), show: () => canManage },
              { label: 'Test', icon: <FaIcon icon="fa-flask-vial" />, onClick: (row) => handleTest(row.id), disabled: (row) => row.status === 'Disconnected', show: () => canManage },
              { label: 'Sync', icon: <FaIcon icon="fa-arrows-rotate" />, onClick: (row) => handleSync(row.id), disabled: (row) => row.status !== 'Connected', show: () => canManage },
              { label: 'Disconnect', icon: <FaIcon icon="fa-link-slash" />, variant: 'danger' as const, onClick: (row) => handleDisconnect(row.id), show: (row) => row.status === 'Connected' && canManage },
              { label: 'Delete', icon: <FaIcon icon="fa-trash" />, variant: 'danger' as const, onClick: (row) => handleDelete(row.id), show: () => canManage },
            ]}
          />
        </Card>
      ) : (
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <Flex vertical align="center" gap={token.paddingMD} style={{ textAlign: 'center' }}>
            <FaIcon icon="fa-plug" style={{ fontSize: token.fontSizeHeading2, color: token.colorTextQuaternary }} />
            <Typography.Title level={5} style={{ margin: 0 }}>No providers connected</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, maxWidth: 400 }}>
              Connect a Git provider to sync repositories and enable automated scanning.
            </Typography.Text>
            {canManage && (
              <Dropdown menu={{ items: connectMenuItems }} trigger={['click']}>
                <Button type="primary" icon={<FaIcon icon="fa-plus" />}>Connect provider</Button>
              </Dropdown>
            )}
          </Flex>
        </Card>
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Repository catalog</div>
        <DataTable
          source={makeSource(reposQuery.data)}
          columns={[
            { key: 'repository', header: 'Repository', sortable: true, sortValue: (row) => row.fullName, render: (row) => (
              <Flex vertical>
                <Typography.Text strong>{row.fullName}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.visibility}</Typography.Text>
              </Flex>
            )},
            { key: 'provider', header: 'Provider', render: () => (
              <StatusPill variant="blue">{providers.find(p => p.id === firstProviderId)?.name || 'SCM'}</StatusPill>
            )},
            { key: 'branch', header: 'Branch', render: (row) => <Typography.Text code style={{ fontSize: token.fontSizeSM }}>{row.branch}</Typography.Text> },
            { key: 'status', header: 'Status', render: (row) => (
              <Flex align="center" gap={token.paddingSM} wrap>
                <StatusPill variant={row.imported ? 'teal' : 'amber'}>
                  {row.imported ? 'Imported' : 'Available'}
                </StatusPill>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {row.webhookStatus === 'active' ? 'Webhook active' : row.webhookStatus === 'pending' ? 'Webhook pending' : row.imported ? 'No webhook' : ''}
                </Typography.Text>
              </Flex>
            )},
            { key: 'project', header: 'Project', render: (row) => row.project ? <Typography.Text>{row.project}</Typography.Text> : <Typography.Text type="secondary">Not imported</Typography.Text> },
          ]}
          rowKey={(row) => row.id}
          emptyText="No repositories found. Click Sync to discover repos from your provider."
          searchable
          searchPlaceholder="Search repositories..."
          searchValue={params.search}
          onSearchChange={setSearch}
          filters={[
            { key: 'status', label: 'Status', placeholder: 'All statuses', options: STATUS_OPTIONS },
          ]}
          filterValues={params.filters}
          onFilterChange={setFilter}
          actions={[
            { label: 'Import', icon: <FaIcon icon="fa-download" />, onClick: (row) => handleImport(row.id, row.fullName), show: (row) => !row.imported && canManage },
            { label: 'Uninstall', icon: <FaIcon icon="fa-trash" />, variant: 'danger', onClick: (row) => handleUninstall(row.importId, row.fullName), show: (row) => row.imported && canManage },
          ]}
          onChange={(p, ps) => setPagination(p, ps)}
        />
      </Card>

      <Card styles={{ body: { padding: token.paddingXL } }}>
        <Typography.Title level={5} style={{ margin: `0 0 ${token.marginXS}px` }}>Pull request review output</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.paddingLG }}>
          Provider delivery controls. The pass/fail gate rule is owned by Analysis Policy.
        </Typography.Text>
        <Flex vertical gap={token.paddingSM}>
          {prReviewItems.map((item, index) => (
            <Flex key={index} justify="space-between" align="center" style={{ padding: `${token.paddingSM}px ${token.paddingMD}px`, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius }}>
              <Flex vertical style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ fontSize: token.fontSize }}>{item.title}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{item.description}</Typography.Text>
              </Flex>
              <Switch
                disabled={!canManage}
                checked={Boolean(prReviewSettingsQuery.data?.[item.key as keyof typeof prReviewSettingsQuery.data] ?? item.defaultChecked)}
                onChange={(checked) => {
                  updatePrReviewSettingsMutation.mutate({ [item.key]: checked });
                }}
              />
            </Flex>
          ))}
        </Flex>
        <Flex gap={token.paddingMD} style={{ marginTop: token.paddingLG }} wrap="wrap">
          <Form.Item label="Status context" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <Input
              disabled={!canManage}
              value={prReviewSettingsQuery.data?.statusContext}
              onChange={(e) => {
                updatePrReviewSettingsMutation.mutate({ statusContext: e.target.value });
              }}
            />
          </Form.Item>
          <Form.Item label="Review summary format" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <Select
              disabled={!canManage}
              value={prReviewSettingsQuery.data?.reviewSummaryFormat}
              onChange={(value) => {
                updatePrReviewSettingsMutation.mutate({ reviewSummaryFormat: value });
              }}
              style={{ width: '100%' }}
              options={[{ value: 'compact', label: 'Compact' }, { value: 'detailed', label: 'Detailed with findings' }]}
            />
          </Form.Item>
        </Flex>
      </Card>

      <SetupGuideDrawer open={setupGuideOpen} onClose={() => { setSetupGuideOpen(false); setSelectedProvider(null); }} providerId={selectedProvider} onConnect={handleConnectFromDrawer} />
      <ConfigureProviderModal open={configureOpen} providerName={selectedProviderName} isConnected={providers.some(p => p.name === selectedProviderName && p.status === 'Connected')} existingProvider={providers.find(p => p.name === selectedProviderName)} onCancel={() => setConfigureOpen(false)} onSave={async (values) => {
        const creds = values.credentials as Record<string, unknown>;
        const cleanCreds = Object.fromEntries(Object.entries(creds).filter(([, v]) => v !== '••••••••••••' && v !== undefined && v !== ''));
        const existing = providers.find(p => p.name === selectedProviderName);
        try {
          let providerId = existing?.id;
          if (existing) {
            const result = await updateProviderMutation.mutateAsync({ id: existing.id, data: { provider: String(values.provider).toLowerCase(), name: String(values.name), credentials: cleanCreds } });
            message.success('Provider updated');
            if (result?.redirectUrl) { window.location.href = result.redirectUrl; return; }
          } else {
            const result = await addProviderMutation.mutateAsync({ provider: String(values.provider).toLowerCase(), name: String(values.name), credentials: cleanCreds });
            providerId = result?.sourceControl?.id;
            message.success('Provider connected');
            if (result.redirectUrl) { window.location.href = result.redirectUrl; return; }
          }
          setConfigureOpen(false);
          if (providerId) {
            await sourceControlsQuery.refetch();
            testProviderMutation.mutate(providerId, {
              onSuccess: () => {
                message.success('Connection test passed');
                syncProviderMutation.mutate(providerId, {
                  onSuccess: (results) => { setSyncResults(results); setSyncResultsOpen(true); },
                  onError: () => {},
                });
              },
              onError: () => {},
            });
          }
        } catch (err) { message.error(errorMessage(err)); }
      }} />
      <ImportRepoModal open={importOpen} repoFullName={selectedRepo} onClose={() => setImportOpen(false)} onSave={() => { importRepositoryMutation.mutate({ providerId: firstProviderId, sourceRepositoryId: selectedRepoSourceControlId }, { onSuccess: () => { message.success(`${selectedRepo} imported`); setImportOpen(false); }, onError: () => message.error('Failed to import repository') }); }} />
      <SyncResultsModal open={syncResultsOpen} results={syncResults} onClose={() => setSyncResultsOpen(false)} />
    </Flex>
  );
}
