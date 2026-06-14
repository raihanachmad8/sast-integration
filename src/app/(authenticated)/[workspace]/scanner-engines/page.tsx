'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, App, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { RulesDrawer } from '@/features/scanner-engines/ScannerModals';
import { useScannerEnginesQuery } from '@/modules/scanner-engines';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ErrorState } from '@/components/shared/ErrorState';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/components/shared/StatusPill';

interface ScannerDisplay {
  id: string;
  name: string;
  icon: string;
  capability: string;
  status: string;
  rules: string;
  version: string;
  enabled: boolean;
}

function mapEngine(e: { name: string; command: string; format: string; status: string }): ScannerDisplay {
  const nameMap: Record<string, { icon: string; capability: string; version: string }> = {
    semgrep: { icon: 'fa-magnifying-glass-code', capability: 'Multi-language SAST', version: '1.x' },
    gitleaks: { icon: 'fa-key', capability: 'Secret scanning', version: '8.x' },
    flawfinder: { icon: 'fa-bug', capability: 'C/C++ sink detection', version: '2.x' },
    cppcheck: { icon: 'fa-code', capability: 'C/C++ static analysis', version: '2.x' },
    'clang-tidy': { icon: 'fa-magnifying-glass', capability: 'C/C++ linting & analysis', version: '22.x' },
    'gcc-fanalyzer': { icon: 'fa-chart-line', capability: 'C/C++ static analysis', version: '15.x' },
  };
  const meta = nameMap[e.name] ?? { icon: 'fa-magnifying-glass', capability: e.format, version: '1.x' };
  return {
    id: e.name,
    name: e.name,
    icon: meta.icon,
    capability: meta.capability,
    status: e.status === 'ready' ? 'Ready' : 'Not installed',
    rules: e.status === 'ready' ? 'Active' : 'Not configured',
    version: meta.version,
    enabled: e.status === 'ready',
  };
}

function buildColumns(_token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<ScannerDisplay>[] {
  return [
    {
      key: 'name',
      header: 'Scanner',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Typography.Text strong>{row.name}</Typography.Text>
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
      render: (row) => <StatusPill variant={row.status === 'Ready' ? 'teal' : 'amber'}>{row.status}</StatusPill>,
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
  ];
}

export default function ScannerEnginesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<ScannerDisplay | null>(null);

  const query = useScannerEnginesQuery();
  const scanners = useMemo(() => (query.data?.data ?? []).map(mapEngine), [query.data?.data]);

  const handleProbeAll = () => {
    message.info('Scanner probing is not yet implemented.');
  };

  const handleApplyChanges = () => {
    message.info('Scanner configuration changes are not yet implemented.');
  };

  const handleBrowseRules = useCallback((scanner: ScannerDisplay) => {
    setSelectedScanner(scanner);
    setRulesOpen(true);
  }, []);

  const columns = useMemo(() => buildColumns(token), [token]);

  const actions = useMemo<ActionConfig<ScannerDisplay>[]>(() => [
    { label: 'Browse rules', onClick: (scanner) => handleBrowseRules(scanner) },
  ], [handleBrowseRules]);

  if (query.isError) return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Scanner Engines" description="View and manage static analysis scanner engines available in this workspace." />
      <ErrorState title="Failed to load scanners" description="Could not load scanner engine data." onRetry={() => query.refetch()} />
    </Flex>
  );

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Scanner Engines"
        description="View and manage static analysis scanner engines available in this workspace."
        actions={
          <Flex gap={token.marginMD}>
            <PermissionGate permission={PERMISSION.SCANNER_MANAGE}>
              <Button onClick={handleProbeAll} icon={<FaIcon icon="fa-satellite-dish" />}>Probe all</Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSION.SCANNER_MANAGE}>
              <Button type="primary" onClick={handleApplyChanges} icon={<FaIcon icon="fa-check" />}>Apply changes</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <DataTable
        source={{ data: scanners, meta: { page: 1, pageSize: scanners.length, total: scanners.length } }}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
        emptyText="No scanners installed."
        isLoading={query.isLoading}
      />

      <RulesDrawer open={rulesOpen} scanner={selectedScanner} onClose={() => setRulesOpen(false)} />
    </Flex>
  );
}
