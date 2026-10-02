'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select, Card, Checkbox, Typography, App, Form, Row, Col, Flex, theme } from 'antd';
const { Title } = Typography;
import { useSessionQuery } from '@/modules/auth/queries';
import { FaIcon } from '@/components/shared/fa-icon';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { Toolbar } from '@/components/shared/Toolbar';
import { DataTable } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { SetupGuideDrawer } from '@/features/source-control/SetupGuideDrawer';
import { ConfigureProviderModal, ImportRepoModal, SendTestEventModal, SyncResultsModal } from '@/features/source-control/SourceControlModals';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useSourceControlsQuery, useCreateSourceControlMutation, useDeleteSourceControlMutation, useReposQuery } from '@/modules/source-control/queries';
import type { RepoCatalog } from '@/modules/source-control/queries';

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
  lastSync: string;
  features: string[];
}

const PROVIDER_ICONS: Record<string, string> = {
  github: 'fa-brands fa-github',
  gitlab: 'fa-brands fa-gitlab',
  gitea: 'fa-solid fa-code-fork',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'imported', label: 'Imported' },
  { value: 'discovered', label: 'Discovered' },
];

function mapApiProviderToScmProvider(apiProvider: { id: string; provider: string; name: string; created_at: string }): ScmProvider {
  return {
    id: apiProvider.id,
    name: apiProvider.name,
    icon: PROVIDER_ICONS[apiProvider.provider] ?? 'fa-solid fa-code',
    mode: apiProvider.provider,
    modeDetail: 'Connected',
    status: 'Connected',
    org: '',
    repos: 0,
    imported: 0,
    lastSync: apiProvider.created_at,
    features: [],
  };
}

function ProviderCard({ provider, onSetupGuide, onConfigure, onTest, onSync, onDisconnect }: { provider: ScmProvider; onSetupGuide: (id: string) => void; onConfigure: (provider: string) => void; onTest: (provider: string) => void; onSync: (provider: string) => void; onDisconnect: (provider: string) => void }) {
  const { token } = theme.useToken();
  return (
    <Card styles={{ body: { padding: token.paddingXL, display: 'flex', flexDirection: 'column', gap: token.paddingLG } }}>
      <Flex align="flex-start" justify="space-between">
        <Flex align="center" gap={token.paddingLG}>
           <div style={{ width: 40, height: 40, borderRadius: token.borderRadiusLG, background: token.colorBgLayout, color: token.colorText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeLG, flexShrink: 0 }}>
            <FaIcon icon={provider.icon} />
          </div>
          <div>
            <Flex align="center" gap={token.paddingSM}>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>{provider.name}</Typography.Text>
              <StatusPill variant={provider.status === 'Connected' ? 'teal' : provider.status === 'Needs refresh' ? 'amber' : 'slate'}>
                {provider.status}
              </StatusPill>
            </Flex>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: token.paddingXS }}>{provider.mode} · {provider.modeDetail}</div>
          </div>
        </Flex>
        <div style={{ textAlign: 'right', fontSize: token.fontSizeSM, color: token.colorTextSecondary, lineHeight: 1.6 }}>
          <div><strong style={{ color: token.colorText }}>{provider.repos}</strong> discovered</div>
          <div><strong style={{ color: token.colorText }}>{provider.imported}</strong> imported</div>
          <div>{provider.lastSync}</div>
        </div>
      </Flex>

      <Flex wrap gap={token.paddingXS}>
        {provider.features.map((f) => (
          <StatusPill key={f} variant="slate">{f}</StatusPill>
        ))}
      </Flex>

      {provider.status === 'Needs refresh' && (
        <div style={{ padding: `${token.paddingMD} ${token.paddingLG}`, background: token.colorWarningBg, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorWarning}`, fontSize: token.fontSizeSM, color: token.colorWarningDark }}>
          Token needs refresh. Re-authorize via <strong>Configure</strong> or follow the <strong>Setup guide</strong>.
        </div>
      )}
      {provider.status === 'Disconnected' && (
        <div style={{ padding: `${token.paddingMD} ${token.paddingLG}`, background: token.colorBgLayout, borderRadius: token.borderRadiusLG, border: `1px dashed ${token.colorBorderSecondary}`, fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
          Not connected. Use <strong>Setup guide</strong> for step-by-step instructions, then <strong>Connect</strong> to save credentials.
        </div>
      )}

      <Flex wrap gap={token.paddingSM}>
        <Button size="small" onClick={() => onSetupGuide(provider.id)}><FaIcon icon="fa-book-open" /> Setup guide</Button>
        <Button size="small" onClick={() => onConfigure(provider.name)}><FaIcon icon="fa-gear" /> {provider.status === 'Connected' || provider.status === 'Needs refresh' ? 'Configure' : 'Connect'}</Button>
        <Button size="small" disabled={provider.status === 'Disconnected'} onClick={() => onTest(provider.name)}><FaIcon icon="fa-flask-vial" /> Test</Button>
        <Button size="small" disabled={provider.status === 'Disconnected'} onClick={() => onSync(provider.name)}><FaIcon icon="fa-arrows-rotate" /> Sync</Button>
        {provider.status === 'Connected' && <Button size="small" danger style={{ alignSelf: 'flex-start' }} onClick={() => onDisconnect(provider.id)}><FaIcon icon="fa-link-slash" /> Disconnect</Button>}
      </Flex>
    </Card>
  );
}

export default function SourceControlPage() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const sourceControlsQuery = useSourceControlsQuery(workspaceId);
  const _createSourceControlMutation = useCreateSourceControlMutation(workspaceId);
  const deleteSourceControlMutation = useDeleteSourceControlMutation(workspaceId);
  const reposQuery = useReposQuery();

  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [configureOpen, setConfigureOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [testEventOpen, setTestEventOpen] = useState(false);
  const [syncResultsOpen, setSyncResultsOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedProviderName, setSelectedProviderName] = useState('');

  const { params, setPage, setPageSize, setSearch, setFilter, filtered: filteredRepos = [], paginated: pagedRepos = [] } = useTableParams<RepoCatalog>({
    data: reposQuery.data ?? [],
    searchField: 'fullName',
    extraFilter: (repo, filters) => {
      if (filters.status) {
        return (filters.status === 'imported' && repo.imported) || (filters.status === 'discovered' && !repo.imported);
      }
      return true;
    },
    defaultPageSize: 10,
    filterKeys: ['status'],
  });

  const providers = useMemo(() => {
    if (!sourceControlsQuery.data) return [];
    return sourceControlsQuery.data.map(mapApiProviderToScmProvider);
  }, [sourceControlsQuery.data]);

  const handleSetupGuide = (providerId: string) => {
    setSelectedProvider(providerId);
    setSetupGuideOpen(true);
  };

  const handleConfigure = (providerName: string) => {
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
    modal.confirm({
      title: 'Disconnect?',
      content: 'Disconnect this provider?',
      okText: 'Disconnect',
      okButtonProps: { danger: true },
      onOk: () => deleteSourceControlMutation.mutate(providerId),
    });
  };

  const handleSyncConnected = () => {
    message.loading('Syncing all providers...', 2).then(() => {
      setSyncResultsOpen(true);
    });
  };

  const handleConnectProvider = () => {
    setSelectedProviderName('GitHub');
    setConfigureOpen(true);
  };

  const handleImport = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    setImportOpen(true);
  };

  const handleUninstall = (repoFullName: string) => {
    modal.confirm({
      title: 'Uninstall?',
      content: `Uninstall ${repoFullName}?`,
      okText: 'Uninstall',
      okButtonProps: { danger: true },
      onOk: () => message.success(`${repoFullName} uninstalled`),
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
    return <ErrorState onRetry={() => sourceControlsQuery.refetch()} />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Source Control"
        description="Connect SCM providers, sync provider repository catalogs, then import repositories into internal Projects."
        actions={
          <PermissionGate permission={PERMISSION.INTEGRATION_MANAGE}>
            <Flex gap={token.paddingMD}>
              <Button onClick={handleSyncConnected}><FaIcon icon="fa-rotate" /> Sync connected</Button>
              <Button type="primary" onClick={handleConnectProvider}><FaIcon icon="fa-plus" /> Connect provider</Button>
            </Flex>
          </PermissionGate>
        }
      />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: token.paddingXL }}>
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} onSetupGuide={handleSetupGuide} onConfigure={handleConfigure} onTest={handleTest} onSync={handleSync} onDisconnect={handleDisconnect} />
        ))}
      </section>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <Flex align="center" justify="space-between">
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>Repository catalog</Title>
              <Typography.Paragraph style={{ margin: `${token.paddingXS}px 0 0`, color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
                Synced from connected providers. Import creates an internal repository binding and provisions the SCM webhook.
              </Typography.Paragraph>
            </div>
            <Flex gap={token.paddingSM}>
              <StatusPill variant="slate">{reposQuery.data?.length ?? 0} repositories</StatusPill>
              <StatusPill variant="teal">{reposQuery.data?.filter(r => r.imported).length ?? 0} imported</StatusPill>
              <StatusPill variant="blue">{reposQuery.data?.filter(r => r.webhookStatus === 'active').length ?? 0} connected</StatusPill>
            </Flex>
          </Flex>
        </div>

        <Toolbar>
          <Input allowClear style={{ maxWidth: 360, flex: 1 }} placeholder="Search repositories..." prefix={<FaIcon icon="fa-magnifying-glass" />} value={params.search} onChange={(e) => setSearch(e.target.value)} />
          <Select style={{ width: 180, flexShrink: 0 }} value={params.filters.status ?? 'all'} onChange={(v) => setFilter('status', v === 'all' ? '' : v)} options={STATUS_OPTIONS} />
        </Toolbar>

        <DataTable
            data={pagedRepos}
            columns={[
              { key: 'repository', header: 'Repository', render: (row) => <div><div style={{ fontWeight: 600 }}>{row.fullName}</div><div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{row.provider} • {row.visibility}</div></div> },
              { key: 'branch', header: 'Branch', render: (row) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{row.branch}</Typography.Text> },
              { key: 'status', header: 'Status', render: (row) => (
                <Flex align="center" gap={token.paddingSM} wrap>
                  <StatusPill variant={!row.imported ? 'amber' : row.webhookStatus === 'active' ? 'teal' : 'blue'}>
                    {!row.imported ? 'Discovered' : row.webhookStatus === 'active' ? 'Active' : 'Imported'}
                  </StatusPill>
                  <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                    {row.webhookStatus === 'active' ? 'Webhook active' : row.webhookStatus === 'pending' ? 'Webhook pending' : 'No webhook'}
                  </Typography.Text>
                </Flex>
              )},
              { key: 'project', header: 'Project', render: (row) => row.project ? <Typography.Text style={{ color: token.colorText }}>{row.project}</Typography.Text> : <Typography.Text style={{ color: token.colorTextSecondary }}>Not imported</Typography.Text> },
              { key: 'actions', header: 'Actions', align: 'right', render: (row) => (
                row.imported
                  ? <Button size="small" danger onClick={() => handleUninstall(row.fullName)}><FaIcon icon="fa-trash" /> Uninstall</Button>
                  : <Button size="small" type="primary" onClick={() => handleImport(row.fullName)}><FaIcon icon="fa-download" /> Import</Button>
              )},
            ]}
            rowKey={(row) => row.id}
            emptyText="No repositories found."
          />

        <TableFooter current={params.page} pageSize={params.per_page} total={filteredRepos.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
      </Card>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} lg={12}>
        <Card styles={{ body: { padding: 0 } }}>
          <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Title level={2} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>Pull request review output</Title>
            <Typography.Paragraph style={{ margin: `${token.paddingXS}px 0 0`, color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
              Provider delivery controls live here. The pass/fail gate rule is owned by Analysis Policy.
            </Typography.Paragraph>
          </div>
          <div style={{ padding: token.paddingXL, display: 'grid', gap: token.paddingMD }}>
            {[
              ['Post PR summary comment', 'Create or update one provider comment with issue counts and review summary.'],
              ['Inline code annotations', 'Publish detailed finding lines when the provider supports diff mapping.'],
              ['Publish quality gate status', 'Publish commit status back to the Git provider for branch protection.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ padding: token.paddingLG, borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: token.fontSize }}>{title}</div>
                  <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{desc}</div>
                </div>
                <Checkbox defaultChecked />
              </div>
            ))}
          </div>
          <div style={{ padding: `0 ${token.paddingXL} ${token.paddingXL}` }}>
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
          </div>
        </Card>
        </Col>

        <Col xs={24} lg={12}>
        <Card styles={{ body: { padding: token.paddingXL } }}>
          <Title level={2} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>Inbound SCM webhook</Title>
          <Typography.Paragraph style={{ margin: `${token.paddingSM}px 0`, color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
            Push and pull request events should route through Source Control, not outgoing Webhooks.
          </Typography.Paragraph>
          <div style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}`, marginTop: token.paddingLG }}>
            <div style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endpoint</div>
            <div style={{ marginTop: token.paddingSM, fontFamily: 'monospace', fontSize: token.fontSizeSM, color: token.colorTextSecondary, wordBreak: 'break-all' }}>/api/v1/source-control/webhooks/github</div>
          </div>
          <Flex gap={token.paddingXS} style={{ marginTop: token.paddingLG }} wrap>
            <StatusPill variant="teal">push</StatusPill>
            <StatusPill variant="teal">pull_request</StatusPill>
            <StatusPill variant="slate">signature verified</StatusPill>
          </Flex>
          <Button block style={{ marginTop: token.paddingLG }} onClick={handleSendTestEvent}>Send test event</Button>
        </Card>
        </Col>
      </Row>

      <SetupGuideDrawer open={setupGuideOpen} onClose={() => { setSetupGuideOpen(false); setSelectedProvider(null); }} providerId={selectedProvider} />
      <ConfigureProviderModal open={configureOpen} providerName={selectedProviderName} isConnected={providers.some(p => p.name === selectedProviderName && p.status === 'Connected')} onCancel={() => setConfigureOpen(false)} onSave={() => { setConfigureOpen(false); message.success('Configuration saved'); }} />
      <ImportRepoModal open={importOpen} repoFullName={selectedRepo} onClose={() => setImportOpen(false)} onSave={(_v) => message.success('Repository imported')} />
      <SendTestEventModal open={testEventOpen} onClose={() => setTestEventOpen(false)} onSend={(type) => { message.success(`Test ${type} event sent`); }} />
      <SyncResultsModal open={syncResultsOpen} results={{ provider: 'All providers', repos: 15, imported: 3, newWebhooks: 2 }} onClose={() => setSyncResultsOpen(false)} />
    </Flex>
  );
}
