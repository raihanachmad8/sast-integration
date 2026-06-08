'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select, Card, Checkbox, Typography, App, Form, Row, Col, Flex, Dropdown, List, Grid, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
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
import { useSourceControlProvidersQuery, useSourceControlReposQuery, useDeleteSourceControlMutation } from '@/modules/source-control';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/shared/ConfirmDialog';

interface ScmProvider {
  id: string;
  name: string;
  icon: string;
  mode: string;
  modeDetail: string;
  status: 'Connected' | 'Needs refresh' | 'Disconnected';
  org: string;
  repos: number;
  imported: number;
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
  { value: 'all', label: 'All statuses' },
  { value: 'imported', label: 'Imported' },
  { value: 'discovered', label: 'Discovered' },
];

function mapApiProviderToScmProvider(apiProvider: { id: string; name: string; type?: string; status?: string; mode?: string; org?: string; discovered?: number; imported?: number }): ScmProvider {
  return {
    id: apiProvider.id,
    name: apiProvider.name,
    icon: PROVIDER_ICONS[apiProvider.type ?? ''] ?? 'fa-solid fa-code',
    mode: apiProvider.type ?? 'github',
    modeDetail: apiProvider.mode ?? 'Connected',
    status: (apiProvider.status as ScmProvider['status']) ?? 'Connected',
    org: apiProvider.org ?? '',
    repos: apiProvider.discovered ?? 0,
    imported: apiProvider.imported ?? 0,
  };
}

export default function SourceControlPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const sourceControlsQuery = useSourceControlProvidersQuery();
  const deleteSourceControlMutation = useDeleteSourceControlMutation();

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
    per_page: params.per_page,
    search: params.search || undefined,
  });

  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [configureOpen, setConfigureOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [testEventOpen, setTestEventOpen] = useState(false);
  const [syncResultsOpen, setSyncResultsOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
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

  const handleSync = (providerName: string) => {
    message.loading(`Syncing ${providerName}...`, 2).then(() => {
      setSyncResultsOpen(true);
    });
  };

  const handleDisconnect = (providerId: string) => {
    confirm({
      title: 'Disconnect?',
      content: 'Disconnect this provider?',
      okText: 'Disconnect',
      danger: true,
      onOk: () => deleteSourceControlMutation.mutate(providerId),
    });
  };

  const handleSyncConnected = () => {
    message.loading('Syncing all providers...', 2).then(() => {
      setSyncResultsOpen(true);
    });
  };

  const handleConnectProvider = (providerKey: string) => {
    handleSetupGuide(providerKey);
  };

  const handleImport = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    setImportOpen(true);
  };

  const handleUninstall = (repoFullName: string) => {
    confirm({
      title: 'Uninstall?',
      content: `Uninstall ${repoFullName}?`,
      okText: 'Uninstall',
      danger: true,
      onOk: () => { message.success(`${repoFullName} uninstalled`); },
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
    { title: 'Post PR summary comment', description: 'Create or update one provider comment with issue counts and review summary.' },
    { title: 'Inline code annotations', description: 'Publish detailed finding lines when the provider supports diff mapping.' },
    { title: 'Publish quality gate status', description: 'Publish commit status back to the Git provider for branch protection.' },
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
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.provider} · {row.visibility}</Typography.Text>
              </Flex>
            )},
            { key: 'branch', header: 'Branch', render: (row) => <Typography.Text code style={{ fontSize: token.fontSizeSM }}>{row.branch}</Typography.Text> },
            { key: 'status', header: 'Status', render: (row) => (
              <Flex align="center" gap={token.paddingSM} wrap>
                <StatusPill variant={!row.imported ? 'amber' : row.webhookStatus === 'active' ? 'teal' : 'blue'}>
                  {!row.imported ? 'Discovered' : row.webhookStatus === 'active' ? 'Active' : 'Imported'}
                </StatusPill>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {row.webhookStatus === 'active' ? 'Webhook active' : row.webhookStatus === 'pending' ? 'Webhook pending' : 'No webhook'}
                </Typography.Text>
              </Flex>
            )},
            { key: 'project', header: 'Project', render: (row) => row.project ? <Typography.Text>{row.project}</Typography.Text> : <Typography.Text type="secondary">Not imported</Typography.Text> },
          ]}
          rowKey={(row) => row.id}
          emptyText="No repositories found."
          searchable
          searchPlaceholder="Search repositories..."
          searchValue={params.search}
          onSearchChange={setSearch}
          filters={[{ key: 'status', label: 'Status', placeholder: 'All statuses', options: STATUS_OPTIONS }]}
          filterValues={params.filters}
          onFilterChange={setFilter}
          actions={[
            { label: 'Import', icon: <FaIcon icon="fa-download" />, onClick: (row) => handleImport(row.fullName), show: (row) => !row.imported },
            { label: 'Uninstall', icon: <FaIcon icon="fa-trash" />, variant: 'danger', onClick: (row) => handleUninstall(row.fullName), show: (row) => row.imported },
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
              <List
                dataSource={prReviewItems}
                renderItem={(item) => (
                  <List.Item extra={<Checkbox defaultChecked />}>
                    <List.Item.Meta
                      title={<Typography.Text strong>{item.title}</Typography.Text>}
                      description={<Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{item.description}</Typography.Text>}
                    />
                  </List.Item>
                )}
              />
              <Form layout="vertical">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Status context">
                      <Input defaultValue="sast-integration/gate" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Review summary format">
                      <Select defaultValue="compact" style={{ width: '100%' }} options={[{ value: 'compact', label: 'Compact' }, { value: 'detailed', label: 'Detailed with findings' }]} />
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
      <ConfigureProviderModal open={configureOpen} providerName={selectedProviderName} isConnected={providers.some(p => p.name === selectedProviderName && p.status === 'Connected')} existingProvider={providers.find(p => p.name === selectedProviderName)} onCancel={() => setConfigureOpen(false)} onSave={() => { setConfigureOpen(false); message.success('Configuration saved'); }} />
      <ImportRepoModal open={importOpen} repoFullName={selectedRepo} onClose={() => setImportOpen(false)} onSave={() => message.success('Repository imported')} />
      <SendTestEventModal open={testEventOpen} onClose={() => setTestEventOpen(false)} onSend={(type) => { message.success(`Test ${type} event sent`); }} />
      <SyncResultsModal open={syncResultsOpen} results={{ provider: 'All providers', repos: 15, imported: 3, newWebhooks: 2 }} onClose={() => setSyncResultsOpen(false)} />
    </Flex>
  );
}
