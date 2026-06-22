'use client';

import { Table } from 'antd';
import { LoadingState } from '@/commons/components/LoadingState';
import { EmptyState } from '@/commons/components/EmptyState';
import { ErrorState } from '@/commons/components/ErrorState';
import { useQualityGateConfigQuery } from '@/modules/quality-gates';
import type { QualityGate } from '@/commons/types/reports';
import { StatusPill } from '@/commons/components/StatusPill';

interface GateConfigTableProps {
  workspaceId: string;
}

/**
 * Table showing the active quality gate configuration.
 * Since the backend has no results endpoint, this displays the current config.
 *
 * @example
 * <GateConfigTable workspaceId="ws_01" />
 */
export function GateConfigTable(_props: GateConfigTableProps) {
  const configQuery = useQualityGateConfigQuery();
  const gate = configQuery.data;

  const columns = [
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: string) => <StatusPill variant="slate">{threshold}</StatusPill>,
    },
    {
      title: 'Fail Critical',
      dataIndex: 'failOnCritical',
      key: 'failOnCritical',
      render: (val: boolean) => <StatusPill variant={val ? 'red' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail High',
      dataIndex: 'failOnHigh',
      key: 'failOnHigh',
      render: (val: boolean) => <StatusPill variant={val ? 'red' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail Medium',
      dataIndex: 'failOnMedium',
      key: 'failOnMedium',
      render: (val: boolean) => <StatusPill variant={val ? 'amber' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail Low',
      dataIndex: 'failOnLow',
      key: 'failOnLow',
      render: (val: boolean) => <StatusPill variant={val ? 'amber' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail Pending Review',
      dataIndex: 'failOnPending',
      key: 'failOnPending',
      render: (val: boolean) => <StatusPill variant={val ? 'red' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
    {
      title: 'Fail on AI TP',
      dataIndex: 'failOnTp',
      key: 'failOnTp',
      render: (val: boolean) => <StatusPill variant={val ? 'amber' : 'slate'}>{val ? 'Yes' : 'No'}</StatusPill>,
    },
  ];

  if (configQuery.isLoading) {
    return <LoadingState text="Loading gate config..." />;
  }

  if (configQuery.isError) {
    return (
      <ErrorState
        title="Failed to load gate config"
        description="Could not load quality gate configuration."
      />
    );
  }

  if (!gate) {
    return (
      <EmptyState
        icon="fa-clipboard-check"
        title="No gate configuration"
        text="Configure a quality gate to define pass/fail criteria for scans."
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={[gate]}
      rowKey={(r: QualityGate) => r.id}
      pagination={false}
      size="middle"
      scroll={{ x: 600 }}
    />
  );
}
