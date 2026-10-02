'use client';

import { Table, Tag, Typography, theme } from 'antd';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils/formatDate';
import { useQualityGateResultsQuery } from '@/modules/quality-gates/queries';
import type { QualityGateResult } from '@/modules/quality-gates/api';
import type { ColumnsType } from 'antd/es/table';


const STATUS_COLOR: Record<string, string> = {
  passed: 'success',
  failed: 'error',
  warning: 'warning',
};

interface GateResultsTableProps {
  workspaceId: string;
}

export function GateResultsTable({ workspaceId }: GateResultsTableProps) {
  const { token } = theme.useToken();
  const resultsQuery = useQualityGateResultsQuery(workspaceId);
  const results = resultsQuery.data?.results ?? [];

  const columns: ColumnsType<QualityGateResult> = [
    {
      title: 'Scan',
      dataIndex: 'scan_id',
      key: 'scan',
      render: (_, r) => <Typography.Text code style={{ fontSize: token.fontSizeSM }}>{r.scan_id.slice(0, 8)}</Typography.Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, r) => (
        <Tag color={STATUS_COLOR[r.status] ?? 'default'}>
          {r.status}
        </Tag>
      ),
    },
    {
      title: 'Blocking',
      dataIndex: 'blocking_findings',
      key: 'blocking',
      render: (_, r) => (
        <Typography.Text type={r.blocking_findings > 0 ? 'danger' : 'secondary'}>
          {r.blocking_findings}
        </Typography.Text>
      ),
    },
    {
      title: 'Pending',
      dataIndex: 'pending_findings',
      key: 'pending',
      render: (_, r) => (
        <Typography.Text type={r.pending_findings > 0 ? 'warning' : 'secondary'}>
          {r.pending_findings}
        </Typography.Text>
      ),
    },
    {
      title: 'Evaluated',
      dataIndex: 'evaluated_at',
      key: 'evaluated',
      render: (_, r) => <Typography.Text type="secondary">{formatDate(r.evaluated_at)}</Typography.Text>,
    },
  ];

  if (resultsQuery.isLoading) {
    return <LoadingState text="Loading results..." />;
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="fa-clipboard-check"
        title="No gate evaluations yet"
        text="Results appear after scans complete and gates are evaluated."
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={results}
      rowKey={(r) => r.id}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      size="middle"
      scroll={{ x: 600 }}
    />
  );
}
