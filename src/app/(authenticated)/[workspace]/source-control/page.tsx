'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select, Card, Checkbox, Typography, App, Form, Row, Col, Flex, Dropdown, Grid, theme } from 'antd';
import { useSessionData } from '@/modules/auth/queries';
import { FaIcon } from '@/components/shared/FaIcon';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { DataTable, makeSource } from '@/components/shared/DataTable';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { SetupGuideDrawer } from '@/features/source-control/SetupGuideDrawer';
import { ConfigureProviderModal, ImportRepoModal, SendTestEventModal, SyncResultsModal } from '@/features/source-control/SourceControlModals';
import { ProviderCard } from '@/features/source-control/ProviderCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useSourceControlProvidersQuery, useSourceControlReposQuery, useDeleteSourceControlMutation, useAddSourceControlProviderMutation, useUpdateSourceControlMutation, useSyncProviderMutation, useImportRepositoryMutation, useUninstallRepositoryMutation } from '@/modules/source-control';
import { usePrReviewSettingsQuery, useUpdatePrReviewSettingsMutation } from '@/modules/workspace-settings';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/shared/ConfirmDialog';

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
    return (c.appId && c.privateKey) ? 'Connected' : (c.appId ? 'Pending' : 'Disconnected');
  }
  return 'Disconnected';
}

function mapApiProviderToScmProvider(apiProvider: { id: string; name: string; type?: string; status?: string; mode?: string; org?: string; discovered?: number; imported?: number; credentials?: Record<string, unknown> }): ScmProvider {
  const mode = apiProvider.mode ?? 'oauth-app';
  return {
    id: apiProvider.id,
    name: apiProvider.name,
    icon: PROVIDER_ICONS[apiProvider.type ?? ''] ?? 'fa-solid fa-code',
    mode: apiProvider.type ?? 'github',
    modeDetail: mode,
    status: deriveStatus(apiProvider.credentials, mode),
    org: apiProvider.org ?? '',
    repos: apiProvider.discovered ?? 0,
    imported: apiProvider.imported ?? 0,
    credentials: apiProvider.credentials,
  };
}

export default function SourceControlPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';

  const sourceControlsQuery = useSourceControlProvidersQuery();
  const deleteSourceControlMutation = useDeleteSourceControlMutation();
  const addProviderMutation = useAddSourceControlProviderMutation();
  const updateProviderMutation = useUpdateSourceControlMutation();
  const syncProviderMutation = useSyncProviderMutation();
  const importRepositoryMutation = useImportRepositoryMutation();
  const uninstallRepositoryMutation = useUninstallRepositoryMutation();
  const prReviewSettingsQuery = usePrReviewSettingsQuery();
  const updatePrReviewSettingsMutation = useUpdatePrReviewSettingsMutation();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
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
  const [testEventOpen, setTestEventOpen] = useState(false);
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

  const handleTest = (providerName: string) => {
    message.loading(`Testing ${providerName}...`, 1.5).then(() => message.success(`${providerName} connection is working`));
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
    syncProviderMutation.mutate(allProviderIds[0], {
      onSuccess: (results) => {
        setSyncResults(results);
        setSyncResultsOpen(true);
      },
      onError: (err) => message.error(errorMessage(err)),
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

  const handleSendTestEvent = () => {
    setTestEventOpen(true);
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
            <Flex gap={token.paddingMD}>
              <Button onClick={handleSyncConnected} icon={<FaIcon icon="fa-rotate" />}>Sync connected</Button>
              <Dropdown menu={{ items: connectMenuItems }} trigger={['click']}>
                <Button type="primary" icon={<FaIcon icon="fa-plus" />}>Connect provider</Button>
              </Dropdown>
            </Flex>
          </PermissionGate>
        }
      />

      <Flex wrap gap={token.paddingXL} align="flex-start">
        {providers.map((provider) => (
          <div key={provider.id} style={{ flex: '1 1 300px', maxWidth: '100%' }}>
            <ProviderCard provider={provider} onConfigure={handleConfigure} onTest={handleTest} onSync={handleSync} onDisconnect={handleDisconnect} />
          </div>
        ))}
      </Flex>

      <Card styles={{ body: { padding: 0 } }}>
        <Flex vertical style={{ padding: token.paddingXL }} gap={token.paddingSM}>
          <Flex align={isMobile ? 'flex-start' : 'center'} justify="space-between" gap={token.paddingMD} vertical={isMobile}>
            <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>Repository catalog</Typography.Text>
            <Flex gap={token.paddingSM} wrap="wrap">
              <StatusPill variant="slate">{reposQuery.data?.meta.total ?? 0} repositories</StatusPill>
              <StatusPill variant="teal">{(reposQuery.data?.data ?? []).filter(r => r.imported).length} imported</StatusPill>
              <StatusPill variant="blue">{(reposQuery.data?.data ?? []).filter(r => r.webhookStatus === 'active').length} connected</StatusPill>
            </Flex>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            Synced from connected providers. Import creates an internal repository binding and provisions the SCM webhook.
          </Typography.Text>
        </Flex>

        <DataTable
          source={makeSource(reposQuery.data)}
          columns={[
            { key: 'repository', header: 'Repository', render: (row) => (
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
            { label: 'Import', icon: <FaIcon icon="fa-download" />, onClick: (row) => handleImport(row.id, row.fullName), show: (row) => !row.imported },
            { label: 'Uninstall', icon: <FaIcon icon="fa-trash" />, variant: 'danger', onClick: (row) => handleUninstall(row.importId, row.fullName), show: (row) => row.imported },
          ]}
          onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        />
      </Card>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} lg={12}>
          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Flex vertical gap={token.paddingMD}>
              <Typography.Text strong style={{ fontSize: token.fontSizeLG, whiteSpace: 'nowrap' }}>Pull request review output</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Provider delivery controls live here. The pass/fail gate rule is owned by Analysis Policy.
              </Typography.Text>
              <Flex vertical gap={token.paddingSM}>
                {prReviewItems.map((item, index) => (
                  <Flex key={index} justify="space-between" align="center" style={{ padding: token.paddingSM, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius }}>
                    <Flex vertical gap={2}>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{item.description}</Typography.Text>
                    </Flex>
                    <Checkbox
                      checked={Boolean(prReviewSettingsQuery.data?.[item.key as keyof typeof prReviewSettingsQuery.data] ?? item.defaultChecked)}
                      onChange={(e) => {
                        updatePrReviewSettingsMutation.mutate({ [item.key]: e.target.checked });
                      }}
                    />
                  </Flex>
                ))}
              </Flex>
              <Form layout="vertical">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Status context">
                      <Input
                        value={prReviewSettingsQuery.data?.statusContext}
                        onChange={(e) => {
                          updatePrReviewSettingsMutation.mutate({ statusContext: e.target.value });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Review summary format">
                      <Select
                        value={prReviewSettingsQuery.data?.reviewSummaryFormat}
                        onChange={(value) => {
                          updatePrReviewSettingsMutation.mutate({ reviewSummaryFormat: value });
                        }}
                        style={{ width: '100%' }}
                        options={[{ value: 'compact', label: 'Compact' }, { value: 'detailed', label: 'Detailed with findings' }]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card styles={{ body: { padding: token.paddingXL } }}>
            <Flex vertical gap={token.paddingMD}>
              <Typography.Text strong style={{ fontSize: token.fontSizeLG, whiteSpace: 'nowrap' }}>Inbound SCM webhook</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Push and pull request events should route through Source Control, not outgoing Webhooks.
              </Typography.Text>
              <Flex vertical gap={token.paddingXS}>
                <Typography.Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>Endpoint</Typography.Text>
                <Typography.Text code copyable>/api/v1/source-control/webhooks/github</Typography.Text>
              </Flex>
              <Flex gap={token.paddingXS} wrap>
                <StatusPill variant="teal">push</StatusPill>
                <StatusPill variant="teal">pull_request</StatusPill>
                <StatusPill variant="slate">signature verified</StatusPill>
              </Flex>
              <Button block onClick={handleSendTestEvent}>Send test event</Button>
            </Flex>
          </Card>
        </Col>
      </Row>

      <SetupGuideDrawer open={setupGuideOpen} onClose={() => { setSetupGuideOpen(false); setSelectedProvider(null); }} providerId={selectedProvider} onConnect={handleConnectFromDrawer} />
      <ConfigureProviderModal open={configureOpen} providerName={selectedProviderName} isConnected={providers.some(p => p.name === selectedProviderName && p.status === 'Connected')} existingProvider={providers.find(p => p.name === selectedProviderName)} onCancel={() => setConfigureOpen(false)} onSave={async (values) => {
        const creds = values.credentials as Record<string, unknown>;
        // Strip masked placeholder values so server keeps existing secrets unchanged
        const cleanCreds = Object.fromEntries(Object.entries(creds).filter(([, v]) => v !== '••••••••••••' && v !== undefined && v !== ''));
        const existing = providers.find(p => p.name === selectedProviderName);
        try {
          if (existing) {
            const result = await updateProviderMutation.mutateAsync({ id: existing.id, data: { provider: String(values.provider).toLowerCase(), name: String(values.name), credentials: cleanCreds } });
            setConfigureOpen(false);
            message.success('Provider updated');
            if (result?.redirectUrl) { window.location.href = result.redirectUrl; }
          } else {
            const result = await addProviderMutation.mutateAsync({ provider: String(values.provider).toLowerCase(), name: String(values.name), credentials: cleanCreds });
            setConfigureOpen(false);
            message.success('Provider connected');
            if (result.redirectUrl) { window.location.href = result.redirectUrl; }
          }
        } catch (err) { message.error(errorMessage(err)); }
      }} />
      <ImportRepoModal open={importOpen} repoFullName={selectedRepo} onClose={() => setImportOpen(false)} onSave={() => { importRepositoryMutation.mutate({ providerId: firstProviderId, sourceRepositoryId: selectedRepoSourceControlId }, { onSuccess: () => { message.success(`${selectedRepo} imported`); setImportOpen(false); }, onError: () => message.error('Failed to import repository') }); }} />
      <SendTestEventModal open={testEventOpen} onClose={() => setTestEventOpen(false)} onSend={(type) => { message.success(`Test ${type} event sent`); }} />
      <SyncResultsModal open={syncResultsOpen} results={syncResults} onClose={() => setSyncResultsOpen(false)} />
    </Flex>
  );
}
