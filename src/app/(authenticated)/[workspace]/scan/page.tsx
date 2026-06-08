'use client';

import { useState } from 'react';
import { App, Button, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useSessionQuery } from '@/modules/auth/queries';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  ScanTable,
  ScanSummaryCards,
  ScanDetailDrawer,
  NewScanModal,
} from '@/features/scan';
import type { ScanRow } from '@/features/scan/types';
import type { ScanDetail } from '@/features/scan/types';
import { FaIcon } from '@/components/shared/FaIcon';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useScanListQuery } from '@/modules/scan';

/**
 * Scan management page for the current workspace.
 *
 * Routes: `/{workspaceSlug}/scan`
 */
export default function ScanPage() {
  const { message } = App.useApp();
  const session = useSessionQuery();
  const workspaceSlug = session.data?.workspace?.slug ?? '';
  const router = useRouter();
  const { token } = theme.useToken();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['status', 'stage', 'origin'],
    defaultPageSize: 10,
  });

  const scansQuery = useScanListQuery({
    page: params.page,
    per_page: params.per_page,
    search: params.search || undefined,
    status: params.filters.status || undefined,
    stage: params.filters.stage || undefined,
    origin: params.filters.origin || undefined,
  });

  const scanRows = scansQuery.data?.data ?? [];

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRow | null>(null);
  const [newScanOpen, setNewScanOpen] = useState(false);

  const handleRepoClick = (row: ScanRow) => {
    setSelectedScan(row);
    setDetailDrawerOpen(true);
  };

  const handleRetry = (row: ScanRow) => {
    message.success(`Retrying ${row.repository} scan...`);
  };

  const handleViewFindings = () => {
    router.push(`/${workspaceSlug}/findings`);
  };

  if (scansQuery.isLoading) {
    return <LoadingState text="Loading scans..." fullHeight />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Scans"
        description="Queue status, scan progress, retry path, and finding navigation."
        actions={
          <Button type="primary" onClick={() => setNewScanOpen(true)}>
            <FaIcon icon="fa-play" /> New scan
          </Button>
        }
      />

      <ScanSummaryCards scans={scanRows} />

      <ScanTable
        rows={scanRows}
        totalCount={scansQuery.data?.meta.total ?? 0}
        page={params.page}
        pageSize={params.per_page}
        onPaginationChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        search={params.search}
        onSearchChange={setSearch}
        statusFilter={params.filters.status ?? ''}
        onStatusFilterChange={(v) => setFilter('status', v)}
        stageFilter={params.filters.stage ?? ''}
        onStageFilterChange={(v) => setFilter('stage', v)}
        originFilter={params.filters.origin ?? ''}
        onOriginFilterChange={(v) => setFilter('origin', v)}
        onRepoClick={handleRepoClick}
        onRetry={handleRetry}
        onViewFindings={handleViewFindings}
      />

      <ScanDetailDrawer
        open={detailDrawerOpen}
        onClose={() => { setDetailDrawerOpen(false); setSelectedScan(null); }}
        scan={selectedScan ? {
          id: selectedScan.id,
          repository: selectedScan.repository,
          branch: selectedScan.repoSub.split(' · ')[0] ?? 'main',
          commitSha: '—',
          origin: selectedScan.origin,
          status: selectedScan.status.toLowerCase() as ScanDetail['status'],
          startedAt: selectedScan.repoSub,
          scannerResults: [],
          totalFindings: selectedScan.findings,
          severityBreakdown: { critical: selectedScan.critical, high: 0, medium: 0, low: 0, info: 0 },
          timeline: [],
        } as ScanDetail : null}
        findings={[]}
        onViewFindings={() => { setDetailDrawerOpen(false); handleViewFindings(); }}
        onRetry={() => { setDetailDrawerOpen(false); message.success('Retrying scan...'); }}
      />

      <NewScanModal
        open={newScanOpen}
        onClose={() => setNewScanOpen(false)}
        onConfirm={(config) => { setNewScanOpen(false); message.success(`Scan queued for ${config.repositoryId}`); }}
        repositories={[]}
        policies={[]}
      />
    </Flex>
  );
}
