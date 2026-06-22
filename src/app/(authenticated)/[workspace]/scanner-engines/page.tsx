'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, App, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { FaIcon } from '@/commons/components/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { RulesDrawer } from '@/features/scanner-engines/ScannerModals';
import { useScannerEnginesQuery } from '@/modules/scanner-engines';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/commons/components/StatusPill';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

interface ScannerDisplay {
  id: string;
  name: string;
  icon: string;
  capability: string;
  status: 'Ready' | 'Not installed';
  rules: string;
  enabled: boolean;
}

function mapEngine(e: { name: string; command: string; format: string; status: string }): ScannerDisplay {
  const nameMap: Record<string, { icon: string; capability: string }> = {
    semgrep: { icon: 'fa-magnifying-glass-code', capability: 'Multi-language SAST' },
    gitleaks: { icon: 'fa-key', capability: 'Secret scanning' },
    flawfinder: { icon: 'fa-bug', capability: 'C/C++ sink detection' },
    cppcheck: { icon: 'fa-code', capability: 'C/C++ static analysis' },
    'clang-tidy': { icon: 'fa-magnifying-glass', capability: 'C/C++ linting & analysis' },
    'gcc-fanalyzer': { icon: 'fa-chart-line', capability: 'C/C++ static analysis' },
  };
  const meta = nameMap[e.name] ?? { icon: 'fa-magnifying-glass', capability: e.format };
  return {
    id: e.name,
    name: e.name,
    icon: meta.icon,
    capability: meta.capability,
    status: e.status === 'ready' ? 'Ready' : 'Not installed',
    rules: e.status === 'ready' ? 'Active' : 'Not configured',
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
  ];
}

export default function ScannerEnginesPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.SCANNER_ENGINES}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Scanner Engines" description="View and manage static analysis scanner engines available in this workspace." />
          <ComingSoonCard
            icon="fa-magnifying-glass"
            title="Scanner Engines"
            description="Scanner engines allow you to configure and manage static analysis tools."
            envHint="FEATURE_FLAG_SCANNER_ENGINES"
          />
        </Flex>
      }
    >
      <ScannerEnginesPageContent />
    </FeatureGate>
  );
}

function ScannerEnginesPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<ScannerDisplay | null>(null);

  const query = useScannerEnginesQuery();
  const scanners = useMemo(() => (query.data?.data ?? []).map(mapEngine), [query.data?.data]);

  const handleProbeAll = () => {
    query.refetch();
    message.success('Refreshed');
  };

  const handleBrowseRules = useCallback((scanner: ScannerDisplay) => {
    setSelectedScanner(scanner);
    setRulesOpen(true);
  }, []);

  const columns = useMemo(() => buildColumns(token), [token]);

  const actions = useMemo<ActionConfig<ScannerDisplay>[]>(() => [
    { label: 'Browse rules', onClick: (scanner) => handleBrowseRules(scanner) },
  ], [handleBrowseRules]);

  if (query.isLoading) return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Scanner Engines" description="View and manage static analysis scanner engines available in this workspace." />
      <LoadingState text="Loading scanner engines..." />
    </Flex>
  );

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
