'use client';

import { useState } from 'react';
import { App, Button, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/modules/auth/queries';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  ScanTable,
  ScanDetailDrawer,
  NewScanModal,
} from '@/features/scan';
import type { ScanRow, Finding } from '@/features/scan/types';
import type { ScanDetail, TimelineEvent } from '@/commons/types';
import { FaIcon } from '@/components/shared/FaIcon';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useScanListQuery, useScanDetailQuery, useScanFindingsQuery, useTriggerScanMutation } from '@/modules/scan';
import { useRepositoriesQuery } from '@/modules/repositories';
import { useWorkspace } from '@/hooks/use-workspace';

/**
 * Scan management page for the current workspace.
 *
 * Routes: `/{workspaceSlug}/scan`
 */
export default function ScanPage() {
  const { message } = App.useApp();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';
  const router = useRouter();
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['status', 'stage', 'origin'],
    defaultPageSize: 10,
  });

  const scansQuery = useScanListQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    status: params.filters.status || undefined,
    stage: params.filters.stage || undefined,
    origin: params.filters.origin || undefined,
  });

  const reposQuery = useRepositoriesQuery({ page: 1, perPage: 200, imported: true });
  const triggerScanMutation = useTriggerScanMutation();

  const scanRows = scansQuery.data?.data ?? [];
  const repoOptions = (reposQuery.data?.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    branch: r.defaultBranch ?? 'main',
    provider: r.provider ?? null,
    connectionType: (r.connectionType ?? 'scm') as 'scm' | 'external',
  }));

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRow | null>(null);
  const [newScanOpen, setNewScanOpen] = useState(false);

  // Fetch real detail data when a scan is selected
  const scanDetailQuery = useScanDetailQuery(selectedScan?.id ?? '');
  const scanFindingsQuery = useScanFindingsQuery(selectedScan?.id ?? '');

  const scanDetail = scanDetailQuery.data;
  const scanFindings = scanFindingsQuery.data ?? [];

  const handleRepoClick = (row: ScanRow) => {
    setSelectedScan(row);
    setDetailDrawerOpen(true);
  };

  const handleRetry = (row: ScanRow) => {
    // Find the repository ID from repoOptions by matching name
    const repo = repoOptions.find((r) => r.name === row.repository);
    if (!repo) {
      message.error('Could not find repository to retry');
      return;
    }
    triggerScanMutation.mutate(
      { repositoryId: repo.id, branch: row.repoSub, scanners: ['semgrep', 'gitleaks'] },
      {
        onSuccess: () => message.success(`Retrying ${row.repository} scan...`),
        onError: () => message.error('Failed to retry scan'),
      },
    );
  };

  const handleViewFindings = () => {
    router.push(`/${workspaceSlug}/findings`);
  };

  const handleNewScan = (config: { repositoryId: string; branch: string; profile?: string; scanners?: string[] }) => {
    if (!workspaceId) return;
    const repo = repoOptions.find((r) => r.id === config.repositoryId);
    triggerScanMutation.mutate(
      { repositoryId: config.repositoryId, branch: config.branch, scanners: config.scanners ?? [] },
      {
        onSuccess: () => { setNewScanOpen(false); message.success(`Scan queued for ${repo?.name ?? config.repositoryId}`); },
        onError: () => { message.error('Failed to queue scan'); },
      },
    );
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

      <ScanTable
        rows={scanRows}
        totalCount={scansQuery.data?.meta.total ?? 0}
        page={params.page}
        pageSize={params.perPage}
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
        scan={scanDetail ? {
          ...scanDetail,
          timeline: (scanDetail.timeline ?? []).map((t) => ({
            ...t,
            type: t.type as TimelineEvent['type'],
          })),
        } as ScanDetail : (selectedScan ? {
          id: selectedScan.id,
          repository: selectedScan.repository,
          branch: selectedScan.repoSub,
          commitSha: '—',
          origin: selectedScan.origin,
          status: 'queued',
          startedAt: new Date().toISOString(),
          scannerResults: [],
          totalFindings: selectedScan.findings,
          severityBreakdown: { critical: selectedScan.critical, high: 0, medium: 0, low: 0, info: 0 },
          timeline: [],
        } : null)}
        findings={scanFindings.map((f) => ({
          id: f.id,
          scanner: f.scanner ?? '',
          rule: f.rule ?? '',
          severity: (f.severity ?? 'low') as Finding['severity'],
          filePath: f.file ?? f.filePath ?? '',
          lineNumber: f.lineNumber ?? 0,
          message: f.message ?? '',
          cwe: f.cwe ?? undefined,
          status: (f.status ?? 'open') as Finding['status'],
          aiVerdict: (f.verdict ?? 'pending') as Finding['aiVerdict'],
          confidence: f.confidence ?? undefined,
          codeSnippet: f.codeSnippet ?? undefined,
        }))}
        scanFindingsQuery={scanFindingsQuery}
        onViewFindings={() => { setDetailDrawerOpen(false); handleViewFindings(); }}
        onRetry={() => { setDetailDrawerOpen(false); if (selectedScan) handleRetry(selectedScan); }}
      />

      <NewScanModal
        open={newScanOpen}
        onClose={() => setNewScanOpen(false)}
        onConfirm={handleNewScan}
        repositories={repoOptions}
      />
    </Flex>
  );
}
