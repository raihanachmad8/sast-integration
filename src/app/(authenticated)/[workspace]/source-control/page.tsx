'use client';

import { useState, useMemo } from 'react';
import { Button, Card, Typography, App, Flex, Dropdown, Grid, Avatar, theme } from 'antd';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { SCM_STATUS, WEBHOOK_STATUS } from '@/commons/constants/layout';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { useTableParams } from '@/lib/hooks/useTableParams';

import { useSourceControlProvidersQuery, useSourceControlReposQuery, useDeleteSourceControlMutation, useDisconnectSourceControlMutation, useAddSourceControlProviderMutation, useUpdateSourceControlMutation, useSyncProviderMutation, useImportRepositoryMutation, useUninstallRepositoryMutation, useTestSourceControlMutation } from '@/modules/source-control';
import { useSessionData } from '@/modules/auth/queries';
import { ConfigureModal, ImportRepoModal, SyncResultsModal, SetupGuideDrawer } from '@/features/source-control';

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

function mapApiProviderToScmProvider(apiProvider: { id: string; name: string; provider?: string; type?: string; status?: string; mode?: string; org?: string; discovered?: number; imported?: number; credentials?: Record<string, unknown> }): ScmProvider {
  const creds = apiProvider.credentials as Record<string, unknown> | undefined;
  const mode = (creds?.mode as string) ?? apiProvider.mode ?? 'oauth-app';
  const providerKey = (apiProvider.provider ?? apiProvider.type ?? '').toLowerCase();
  return {
    id: apiProvider.id,
    name: apiProvider.name,
    icon: PROVIDER_ICONS[providerKey] ?? 'fa-solid fa-code',
    mode: providerKey || 'github',
    modeDetail: mode,
    status: deriveStatus(creds, mode),
    org: (creds?.org as string) ?? apiProvider.org ?? '',
    repos: apiProvider.discovered ?? 0,
    imported: apiProvider.imported ?? 0,
    credentials: creds,
  };
}

export default function SourceControlPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      anyFlags={[FEATURE_FLAG.SOURCE_CONTROL_GITHUB, FEATURE_FLAG.SOURCE_CONTROL_GITLAB, FEATURE_FLAG.SOURCE_CONTROL_GITEA]}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Source Control" description="Connect SCM providers, sync provider repository catalogs, then import repositories into internal Projects." />
          <ComingSoonCard
            icon="fa-plug"
            title="Source Control"
            description="Source control integration allows you to connect GitHub, GitLab, or Gitea providers."
            envHint="FEATURE_FLAG_SOURCE_CONTROL_GITHUB"
          />
        </Flex>
      }
    >
      <SourceControlPageContent />
    </FeatureGate>
  );
}

function SourceControlPageContent() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const breakpoints = Grid.useBreakpoint();
  const _isMobile = !breakpoints.md;
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const { has } = usePermissions();
  const canManage = has(PERMISSION.INTEGRATION_MANAGE);

  const sourceControlsQuery = useSourceControlProvidersQuery();
  const deleteSourceControlMutation = useDeleteSourceControlMutation();
  const disconnectSourceControlMutation = useDisconnectSourceControlMutation();
  const addProviderMutation = useAddSourceControlProviderMutation();
  const updateProviderMutation = useUpdateSourceControlMutation();
  const syncProviderMutation = useSyncProviderMutation();
  const importRepositoryMutation = useImportRepositoryMutation();
  const uninstallRepositoryMutation = useUninstallRepositoryMutation();
  const testProviderMutation = useTestSourceControlMutation();


  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['status'],
    defaultPageSize: 10,
  });

  const activeFilters = useMemo(() => {
    const filters = [];
    if (params.filters.status) {
      const statusOption = STATUS_OPTIONS.find((s) => s.value === params.filters.status);
      filters.push({ key: 'status', label: 'Status', value: statusOption?.label ?? params.filters.status });
    }
    return filters;
  }, [params.filters.status]);

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
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
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

  const refetchAll = () => {
    sourceControlsQuery.refetch();
    reposQuery.refetch();
  };

  const handleSync = (providerId: string) => {
    setSyncErrors((prev) => { const next = { ...prev }; delete next[providerId]; return next; });
    syncProviderMutation.mutate(providerId, {
      onSuccess: (results) => {
        setSyncResults(results);
        setSyncResultsOpen(true);
        refetchAll();
      },
      onError: (err) => {
        const msg = errorMessage(err);
        message.error(msg);
        setSyncErrors((prev) => ({ ...prev, [providerId]: msg }));
        sourceControlsQuery.refetch();
      },
    });
  };

  const handleSyncConnected = () => {
    const allProviderIds = providers.map((p) => p.id);
    if (allProviderIds.length === 0) return;
    setSyncErrors({});
    let completed = 0;
    allProviderIds.forEach((id) => {
      syncProviderMutation.mutate(id, {
        onSuccess: (results) => {
          setSyncResults(results);
          setSyncResultsOpen(true);
          completed++;
          if (completed === allProviderIds.length) refetchAll();
        },
        onError: (err) => {
          const msg = errorMessage(err);
          message.error(msg);
          setSyncErrors((prev) => ({ ...prev, [id]: msg }));
          completed++;
          if (completed === allProviderIds.length) sourceControlsQuery.refetch();
        },
      });
    });
  };

  const handleDisconnect = (providerId: string) => {
    confirm({
      title: 'Disconnect?',
      content: 'Disconnect this provider? You can reconnect later.',
      okText: 'Disconnect',
      onOk: () => disconnectSourceControlMutation.mutate(providerId, {
        onSuccess: () => { message.success('Provider disconnected'); refetchAll(); },
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
        onSuccess: () => { message.success('Provider deleted'); refetchAll(); },
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

  const connectMenuItems = PROVIDER_MENU_ITEMS.map((item) => ({
    ...item,
    onClick: () => handleConnectProvider(item.key),
  }));

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
            searchable
            searchPlaceholder="Search providers..."
            emptyText="No providers connected."
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
                <Flex vertical gap={2}>
                  <StatusPill variant={syncErrors[row.id] ? 'red' : row.status === SCM_STATUS.CONNECTED ? 'teal' : row.status === SCM_STATUS.PENDING ? 'amber' : 'slate'}>
                    {syncErrors[row.id] ? 'Sync Failed' : row.status}
                  </StatusPill>
                  {syncErrors[row.id] && <Typography.Text type="danger" style={{ fontSize: token.fontSizeSM }}>{syncErrors[row.id]}</Typography.Text>}
                </Flex>
              )},
              { key: 'repos', header: 'Discovered', render: (row) => <Typography.Text>{row.repos}</Typography.Text> },
              { key: 'imported', header: 'Imported', render: (row) => <Typography.Text>{row.imported}</Typography.Text> },
            ]}
            rowKey={(row) => row.id}
            actions={[
              { label: 'Configure', icon: <FaIcon icon="fa-gear" />, onClick: (row) => handleConfigure(row.name), show: () => canManage },
              { label: 'Test', icon: <FaIcon icon="fa-flask-vial" />, onClick: (row) => handleTest(row.id), disabled: (row) => row.status === SCM_STATUS.DISCONNECTED, show: () => canManage },
              { label: 'Sync', icon: <FaIcon icon="fa-arrows-rotate" />, onClick: (row) => handleSync(row.id), disabled: (row) => row.status !== SCM_STATUS.CONNECTED, show: () => canManage },
              { label: 'Disconnect', icon: <FaIcon icon="fa-link-slash" />, onClick: (row) => handleDisconnect(row.id), show: (row) => row.status === SCM_STATUS.CONNECTED && canManage },
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
                  {row.webhookStatus === WEBHOOK_STATUS.ACTIVE ? 'Webhook active' : row.webhookStatus === WEBHOOK_STATUS.PENDING ? 'Webhook pending' : row.imported ? 'No webhook' : ''}
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
          activeFilters={activeFilters}
          onFilterRemove={(key) => setFilter(key, '')}
          actions={[
            { label: 'Import', icon: <FaIcon icon="fa-download" />, onClick: (row) => handleImport(row.id, row.fullName), show: (row) => !row.imported && canManage },
            { label: 'Uninstall', icon: <FaIcon icon="fa-trash" />, variant: 'danger', onClick: (row) => handleUninstall(row.importId, row.fullName), show: (row) => row.imported && canManage },
          ]}
          onChange={(p, ps) => setPagination(p, ps)}
        />
      </Card>

      <SetupGuideDrawer open={setupGuideOpen} onClose={() => { setSetupGuideOpen(false); setSelectedProvider(null); }} providerId={selectedProvider} onConnect={handleConnectFromDrawer} />
      <ConfigureModal open={configureOpen} providerName={selectedProviderName} isConnected={providers.some(p => p.name === selectedProviderName && p.status === SCM_STATUS.CONNECTED)} existingProvider={providers.find(p => p.name === selectedProviderName)} onCancel={() => setConfigureOpen(false)} onSave={async (values) => {
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
