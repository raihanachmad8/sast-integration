'use client';

import { Card, Button, Typography, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import type { DashboardScan } from '@/modules/dashboard';
import { StatusTag } from '@/components/shared/StatusTag';

interface RecentScansTableProps {
  /** Array of recent scan data. */
  scans: DashboardScan[];
  /** Callback triggered when "View all" is clicked. */
  onViewAll: () => void;
  /** Callback triggered when "View findings" is clicked. */
  onViewFindings: (scan: DashboardScan) => void;
  /** Callback triggered when "Retry" is clicked. */
  onRetry: (scan: DashboardScan) => void;
}

function ScanStatusTag({ status }: { status: string }) {
  return <StatusTag type="scanStatus" value={status} />;
}

/**
 * Table showing recent scan activity with repository, status, stage, findings, and actions.
 * Uses the shared DataTable component for consistency.
 *
 * @example
 * <RecentScansTable
 *   scans={scanRows}
 *   onViewAll={() => navigateTo('/scans')}
 *   onViewFindings={(scan) => openFindings(scan)}
 *   onRetry={(scan) => retryScan(scan)}
 * />
 */
export function RecentScansTable({ scans, onViewAll, onViewFindings, onRetry }: RecentScansTableProps) {
  const { token } = theme.useToken();

  const columns: DataTableColumn<DashboardScan>[] = [
    {
      key: 'repository',
      header: 'REPOSITORY',
      render: (record) => (
        <div>
          <Typography.Text strong>{record.repository}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{record.branch} · {record.time}</Typography.Text>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (record) => <ScanStatusTag status={record.status} />,
    },
    {
      key: 'stage',
      header: 'STAGE',
      render: (record) => <Typography.Text>{record.stage}</Typography.Text>,
    },
    {
      key: 'findings',
      header: 'FINDINGS',
      render: (record) => (
        <span>
          {record.findings}{' '}
          {record.critical > 0 && <Typography.Text type="danger" style={{ fontSize: token.fontSizeSM }}>{record.critical} critical</Typography.Text>}
        </span>
      ),
    },
    {
      key: 'ai',
      header: 'AI',
      render: (record) => <Typography.Text>{record.ai}</Typography.Text>,
    },
  ];

  const actions: ActionConfig<DashboardScan>[] = [
    {
      label: 'Retry',
      icon: <FaIcon icon="fa-rotate" />,
      onClick: (scan) => onRetry(scan),
      show: (scan) => scan.status === 'Failed',
    },
    {
      label: 'View findings',
      icon: <FaIcon icon="fa-eye" />,
      onClick: (scan) => onViewFindings(scan),
      show: (scan) => scan.status !== 'Failed',
    },
  ];

  return (
    <Card
      title="Recent scans"
      extra={
        <Button type="text" icon={<FaIcon icon="fa-list" />} onClick={onViewAll}>
          View all
        </Button>
      }
      styles={{ body: { padding: 0 } }}
    >
      <DataTable
        source={{ data: scans, meta: { page: 1, pageSize: scans.length, total: scans.length } }}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
      />
    </Card>
  );
}
