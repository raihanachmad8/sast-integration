'use client';

import { Flex, Typography, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
import { useDashboardStatsQuery, useDashboardScansQuery, useDashboardFindingsQuery, useDashboardHealthQuery } from '@/modules/dashboard';
import { DashboardSummaryCards, RecentScansTable, AttentionRequired, WorkspaceHealth } from '@/features/dashboard';
import { LoadingState } from '@/components/shared/LoadingState';

/**
 * Workspace dashboard page.
 * Displays summary statistics, recent scans, attention-required findings, and workspace health.
 *
 * @returns The dashboard page with all sections.
 */
export default function DashboardPage() {
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const statsQuery = useDashboardStatsQuery(workspaceId);
  const scansQuery = useDashboardScansQuery(workspaceId);
  const findingsQuery = useDashboardFindingsQuery(workspaceId);
  const healthQuery = useDashboardHealthQuery(workspaceId);

  if (statsQuery.isLoading || scansQuery.isLoading) {
    return <LoadingState text="Loading dashboard..." />;
  }

  const stats = statsQuery.data ?? { connectedRepos: 0, activeScans: 0, criticalFindings: 0, awaitingAi: 0 };
  const scans = scansQuery.data ?? [];
  const findings = findingsQuery.data ?? [];
  const health = healthQuery.data ?? [];

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
            onViewAll={() => {}}
            onViewFindings={() => {}}
            onRetry={() => {}}
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
