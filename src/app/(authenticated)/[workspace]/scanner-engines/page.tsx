'use client';

import { useState, useMemo } from 'react';
import { Button, Input, App, Card, Tag, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Toolbar } from '@/components/shared/Toolbar';
import { TableFooter } from '@/components/shared/TableFooter';
import { RulesDrawer, ScannerSettingsModal } from '@/features/scanner-engines/ScannerModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

const INITIAL_SCANNERS = [
  { id: 'semgrep', name: 'Semgrep', icon: 'fa-magnifying-glass-code', capability: 'Multi-language SAST', status: 'Ready', rules: '132 active', version: '1.x', enabled: true },
  { id: 'gitleaks', name: 'Gitleaks', icon: 'fa-key', capability: 'Secret scanning', status: 'Ready', rules: 'Baseline config', version: '8.x', enabled: true },
  { id: 'flawfinder', name: 'Flawfinder', icon: 'fa-bug', capability: 'C/C++ sink detection', status: 'Ready', rules: 'Runtime default', version: '2.x', enabled: true },
  { id: 'codeql', name: 'CodeQL', icon: 'fa-database', capability: 'Semantic analysis', status: 'Installed, not wired', rules: 'Planned', version: 'Detected', enabled: false },
];

type Scanner = typeof INITIAL_SCANNERS[number];

function buildColumns(handleBrowseRules: (s: Scanner) => void, handleSettings: (s: Scanner) => void, token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<Scanner>[] {
  return [
    {
      key: 'name',
      header: 'Scanner',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex align="center" gap={token.marginMD}>
          <FaIcon icon={row.icon} style={{ width: 18, color: token.colorTextSecondary }} />
          <Typography.Text strong>{row.name}</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'capability',
      header: 'Capability',
      render: (row) => <Typography.Text type="secondary">{row.capability}</Typography.Text>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Tag color={row.status === 'Ready' ? 'success' : 'warning'}>{row.status}</Tag>,
    },
    {
      key: 'rules',
      header: 'Rules',
      render: (row) => <Typography.Text type="secondary">{row.rules}</Typography.Text>,
    },
    {
      key: 'version',
      header: 'Version',
      render: (row) => <Typography.Text type="secondary">{row.version}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={token.marginXS}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleBrowseRules(row); }}>Browse rules</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleSettings(row); }}><FaIcon icon="fa-gear" /></Button>
        </Flex>
      ),
    },
  ];
}

export default function ScannerEnginesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [scanners] = useState(INITIAL_SCANNERS);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<Scanner | null>(null);

  const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams<Scanner>({
    data: scanners,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleProbeAll = () => {
    message.loading('Probing scanners...', 2).then(() => message.success('All scanners probed successfully'));
  };

  const handleApplyChanges = () => {
    message.success('Scanner configuration applied');
  };

  const handleBrowseRules = (scanner: Scanner) => {
    setSelectedScanner(scanner);
    setRulesOpen(true);
  };

  const handleSettings = (scanner: Scanner) => {
    setSelectedScanner(scanner);
    setSettingsOpen(true);
  };

  const handleSaveSettings = (settings: { timeout: string; maxFindings: string }) => {
    message.success('Scanner settings saved');
  };

  const columns = useMemo(() => buildColumns(handleBrowseRules, handleSettings, token), [token]);

  return (
    <Flex vertical gap={token.marginXL}>
      <PageHeader
        title="Scanner Engines"
        description="View and manage static analysis scanner engines available in this workspace."
        actions={
          <Flex gap={token.marginMD}>
            <PermissionGate permission={PERMISSION.SCANNER_MANAGE}>
              <Button onClick={handleProbeAll}><FaIcon icon="fa-satellite-dish" /> Probe all</Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSION.SCANNER_MANAGE}>
              <Button type="primary" onClick={handleApplyChanges}><FaIcon icon="fa-check" /> Apply changes</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search scanners"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        <DataTable
            data={paginated}
            columns={columns}
            rowKey={(r) => r.id}
            emptyText="No scanners installed."
          />
        <TableFooter
          current={params.page}
          pageSize={params.per_page}
          total={filtered.length}
          onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        />
      </Card>

      <RulesDrawer open={rulesOpen} scanner={selectedScanner} onClose={() => setRulesOpen(false)} />
      <ScannerSettingsModal open={settingsOpen} scanner={selectedScanner} onClose={() => setSettingsOpen(false)} onSave={handleSaveSettings} />
    </Flex>
  );
}
