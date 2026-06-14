'use client';

import { Table } from 'antd';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useQualityGatesQuery } from '@/modules/quality-gates';
import type { QualityGate } from '@/commons/types/reports';
import { StatusPill } from '@/components/shared/StatusPill';

interface GateResultsTableProps {
  workspaceId: string;
}

/**
 * Table showing quality gate evaluation results.
 * Uses DataTable pattern with antd tokens.
 *
 * @example
 * <GateResultsTable workspaceId="ws_01" />
 */
export function GateResultsTable(_props: GateResultsTableProps) {
  const resultsQuery = useQualityGatesQuery();
  const data = resultsQuery.data ?? [];

  const columns = [
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: string) => <StatusPill variant="slate">{threshold}</StatusPill>,
    },
    {
      title: 'Fail on Critical',
      dataIndex: 'failOnCritical',
      key: 'failOnCritical',
      render: (val: boolean) => <StatusPill variant={val ? 'red' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail on High TP',
      dataIndex: 'failOnHighTp',
      key: 'failOnHighTp',
      render: (val: boolean) => <StatusPill variant={val ? 'red' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Warn on Pending',
      dataIndex: 'warnOnPending',
      key: 'warnOnPending',
      render: (val: boolean) => <StatusPill variant={val ? 'amber' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Pending Behavior',
      dataIndex: 'pendingBehavior',
      key: 'pendingBehavior',
    },
  ];

  if (resultsQuery.isLoading) {
    return <LoadingState text="Loading results..." />;
  }

  if (data.length === 0) {
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
      dataSource={data}
      rowKey={(r: QualityGate) => r.id}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      size="middle"
      scroll={{ x: 600 }}
    />
  );
}
