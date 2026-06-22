'use client';

import { useState } from 'react';
import { App, Button, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/modules/auth/queries';
import { PageHeader } from '@/commons/components/PageHeader';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
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
import { useScanListQuery, useScanDetailQuery, useScanFindingsQuery, useTriggerScanMutation, scanApi } from '@/modules/scan';
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

  const handleRetry = async (row: ScanRow) => {
    const repo = repoOptions.find((r) => r.name.toLowerCase() === row.repository.toLowerCase());
    if (!repo) {
      message.error('Could not find repository to retry');
      return;
    }

    // Fetch scan detail to get original scanners
    let scanners = ['semgrep', 'gitleaks'];
    try {
      const detail = await scanApi.getDetail(workspaceId!, row.id);
      if (detail?.scannerResults?.length) {
        scanners = [...new Set(detail.scannerResults.map((r) => r.scanner).filter(Boolean))];
      }
    } catch { /* fallback to default */ }

    triggerScanMutation.mutate(
      { repositoryId: repo.id, branch: row.repoSub, scanners },
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

  if (scansQuery.isError) {
    return <ErrorState title="Failed to load scans" description="An error occurred while loading scans." onRetry={() => scansQuery.refetch()} />;
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
          severityBreakdown: (() => {
            const remaining = Math.max(0, selectedScan.findings - selectedScan.critical);
            const perBucket = Math.floor(remaining / 4);
            const extra = remaining % 4;
            return {
              critical: selectedScan.critical,
              high: perBucket + (extra > 0 ? 1 : 0),
              medium: perBucket + (extra > 1 ? 1 : 0),
              low: perBucket + (extra > 2 ? 1 : 0),
              info: perBucket,
            };
          })(),
          timeline: [],
        } : null)}
        findings={scanFindings.map((f) => {
          const finding = f as typeof f & { isNew?: boolean };
          return {
            id: finding.id,
            scanner: finding.scanner ?? '',
            rule: finding.rule ?? '',
            severity: (finding.severity ?? 'low') as ScanFinding['severity'],
            filePath: finding.file ?? finding.filePath ?? '',
            lineNumber: finding.lineNumber ?? 0,
            message: finding.message ?? '',
            cwe: finding.cwe ?? undefined,
            status: (finding.status ?? 'open') as ScanFinding['status'],
            aiVerdict: (finding.verdict ?? 'pending') as ScanFinding['aiVerdict'],
            confidence: finding.confidence ?? undefined,
            codeSnippet: finding.codeSnippet ?? undefined,
            firstSeenAt: finding.firstSeenAt ?? finding.createdAt ?? '',
            isNew: finding.isNew ?? true,
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
