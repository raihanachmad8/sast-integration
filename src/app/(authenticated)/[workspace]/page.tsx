'use client';

import { Flex, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/modules/auth/queries';
import { useDashboardStatsQuery, useDashboardScansQuery, useDashboardFindingsQuery, useDashboardHealthQuery } from '@/modules/dashboard';
import { DashboardSummaryCards, RecentScansTable, AttentionRequired, WorkspaceHealth } from '@/features/dashboard';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import type { DashboardScan } from '@/modules/dashboard';

/**
 * Workspace dashboard page.
 * Displays summary statistics, recent scans, attention-required findings, and workspace health.
 *
 * @returns The dashboard page with all sections.
 */
export default function DashboardPage() {
  const { token } = theme.useToken();
  const router = useRouter();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';
  const workspaceId = session.data?.workspace?.id ?? '';

  const statsQuery = useDashboardStatsQuery(workspaceId);
  const scansQuery = useDashboardScansQuery(workspaceId);
  const findingsQuery = useDashboardFindingsQuery(workspaceId);
  const healthQuery = useDashboardHealthQuery(workspaceId);

  if (statsQuery.isLoading || scansQuery.isLoading) {
    return <LoadingState text="Loading dashboard..." />;
  }

  if (statsQuery.isError || scansQuery.isError) {
    return <ErrorState title="Failed to load dashboard" description="Could not load dashboard data. Please try refreshing." />;
  }

  const stats = statsQuery.data ?? { connectedRepos: 0, activeScans: 0, criticalFindings: 0, awaitingAi: 0 };
  const scans = scansQuery.data ?? [];
  const findings = findingsQuery.data ?? [];
  const healthData = healthQuery.data ?? { scanners: 0, sources: 0, models: 0 };
  const health = [
    { label: 'Scanners', value: healthData.scanners, ready: healthData.scanners > 0 },
    { label: 'Sources', value: healthData.sources, ready: healthData.sources > 0 },
    { label: 'AI Models', value: healthData.models, ready: healthData.models > 0 },
  ];

  const handleViewAll = () => router.push(`/${workspaceSlug}/scans`);
  const handleViewFindings = (scan: DashboardScan) => router.push(`/${workspaceSlug}/scans/${scan.id}`);
  const handleRetry = (_scan: DashboardScan) => {
    // Retry would trigger a new scan for the same repository
    router.push(`/${workspaceSlug}/scans`);
  };

  return (
    <Flex vertical gap={token.paddingXL}>
      <div>
        <Typography.Title level={2} style={{ marginTop: 0, marginBottom: token.marginXS }}>Dashboard</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeLG }}>
          Workspace level security status, recent scans, and review work.
        </Typography.Text>
      </div>

      <DashboardSummaryCards
        connectedRepos={stats.connectedRepos}
        activeScans={stats.activeScans}
        criticalFindings={stats.criticalFindings}
        awaitingAi={stats.awaitingAi}
      />

      <Flex gap={token.paddingLG} wrap="wrap" align="stretch">
        <div style={{ flex: '2 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <RecentScansTable
            scans={scans}
            onViewAll={handleViewAll}
            onViewFindings={handleViewFindings}
            onRetry={handleRetry}
          />
        </div>
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column' }}>
          <AttentionRequired findings={findings} />
        </div>
      </Flex>

      <WorkspaceHealth items={health} />
    </Flex>
  );
}
