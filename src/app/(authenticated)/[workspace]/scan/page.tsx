'use client';

import { useState } from 'react';
import { App, Button, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/modules/auth/queries';
import { PageHeader } from '@/commons/components/PageHeader';
import { LoadingState } from '@/commons/components/LoadingState';
import dynamic from 'next/dynamic';
import { ScanTable, NewScanModal } from '@/features/scan';

const ScanDetailDrawer = dynamic(
  () => import('@/features/scan/ScanDetailDrawer').then((m) => m.ScanDetailDrawer),
  { ssr: false },
);
const CICDSetupModal = dynamic(
  () => import('@/features/scan/CICDSetupModal').then((m) => m.CICDSetupModal),
  { ssr: false },
);
import type { ScanRow, ScanFinding } from '@/features/scan/types';
import type { ScanDetail, TimelineEvent } from '@/commons/types';
import { FaIcon } from '@/commons/components/FaIcon';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useScanListQuery, useScanDetailQuery, useScanFindingsQuery, useTriggerScanMutation } from '@/modules/scan';
import { useRepositoriesQuery } from '@/modules/repositories';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

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

  const { params, setPagination, setSearch, setFilter } = useTableParams({
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
    connectionType: (Array.isArray(r.connectionType) ? r.connectionType : r.connectionType ? [r.connectionType as string] : ['scm']) as string[],
  }));

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRow | null>(null);
  const [newScanOpen, setNewScanOpen] = useState(false);
  const [cicdModalOpen, setCicdModalOpen] = useState(false);

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
          <Flex gap={token.paddingSM}>
            <Button onClick={() => setCicdModalOpen(true)}>
              <FaIcon icon="fa-link" /> CI/CD Setup
            </Button>
            <Button type="primary" onClick={() => setNewScanOpen(true)}>
              <FaIcon icon="fa-play" /> New scan
            </Button>
          </Flex>
        }
      />

      <ScanTable
        rows={scanRows}
        totalCount={scansQuery.data?.meta.total ?? 0}
        page={params.page}
        pageSize={params.perPage}
        onPaginationChange={(p, ps) => setPagination(p, ps)}
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
          newFindings: selectedScan.findings,
          existingFindings: 0,
          severityBreakdown: { critical: selectedScan.critical, high: 0, medium: 0, low: 0, info: 0 },
          timeline: [],
        } : null)}
        findings={scanFindings.map((f) => {
          const firstSeen = f.firstSeenAt ?? f.createdAt ?? '';
          const scanStarted = scanDetailQuery.data?.startedAt ?? '';
          const isNew = firstSeen && scanStarted ? new Date(firstSeen) >= new Date(scanStarted) : true;
          return {
            id: f.id,
            scanner: f.scanner ?? '',
            rule: f.rule ?? '',
            severity: (f.severity ?? 'low') as ScanFinding['severity'],
            filePath: f.file ?? f.filePath ?? '',
            lineNumber: f.lineNumber ?? 0,
            message: f.message ?? '',
            cwe: f.cwe ?? undefined,
            status: (f.status ?? 'open') as ScanFinding['status'],
            aiVerdict: (f.verdict ?? 'pending') as ScanFinding['aiVerdict'],
            confidence: f.confidence ?? undefined,
            codeSnippet: f.codeSnippet ?? undefined,
            firstSeenAt: firstSeen,
            isNew,
          };
        })}
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

      <CICDSetupModal
        open={cicdModalOpen}
        onClose={() => setCicdModalOpen(false)}
        repository={repoOptions[0] ? { id: repoOptions[0].id, name: repoOptions[0].name, provider: repoOptions[0].provider } : null}
        workspaceSlug={workspaceSlug}
      />
    </Flex>
  );
}
