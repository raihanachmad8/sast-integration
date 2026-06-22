'use client';

import { useMemo, useCallback } from 'react';
import { Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { StatusPill } from '@/commons/components/StatusPill';
import { StatusTag } from '@/commons/components/StatusTag';
import type { ScanRow } from './types';

interface ScanTableProps {
  rows: ScanRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  originFilter: string;
  onOriginFilterChange: (value: string) => void;
  onRepoClick: (row: ScanRow) => void;
  onRetry?: (row: ScanRow) => void;
  onViewFindings?: (row: ScanRow) => void;
  isLoading?: boolean;
  error?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const STAGE_OPTIONS = [
  { value: 'cloning', label: 'Cloning' },
  { value: 'scanning', label: 'Scanning' },
  { value: 'parsing', label: 'Parsing' },
  { value: 'ai_verifying', label: 'AI Verifying' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const ORIGIN_OPTIONS = [
  { value: 'managed', label: 'Managed' },
  { value: 'external_upload', label: 'External Upload' },
];

export function ScanTable({
  rows,
  totalCount,
  page,
  pageSize,
  onPaginationChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stageFilter,
  onStageFilterChange,
  originFilter,
  onOriginFilterChange,
  onRepoClick,
  onRetry,
  onViewFindings,
  isLoading = false,
  error = null,
}: ScanTableProps) {
  const { token } = theme.useToken();

  const activeFilters = useMemo(() => {
    const filters = [];
    if (statusFilter && statusFilter !== 'all') {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      filters.push({ key: 'status', label: 'Status', value: opt?.label ?? statusFilter });
    }
    if (stageFilter && stageFilter !== 'all') {
      const opt = STAGE_OPTIONS.find((o) => o.value === stageFilter);
      filters.push({ key: 'stage', label: 'Stage', value: opt?.label ?? stageFilter });
    }
    if (originFilter && originFilter !== 'all') {
      const opt = ORIGIN_OPTIONS.find((o) => o.value === originFilter);
      filters.push({ key: 'origin', label: 'Origin', value: opt?.label ?? originFilter });
    }
    return filters;
  }, [statusFilter, stageFilter, originFilter]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const normalized = value || 'all';
    switch (key) {
      case 'status': onStatusFilterChange(normalized); break;
      case 'stage': onStageFilterChange(normalized); break;
      case 'origin': onOriginFilterChange(normalized); break;
    }
    onPaginationChange(1, pageSize);
  }, [onStatusFilterChange, onStageFilterChange, onOriginFilterChange, onPaginationChange, pageSize]);

  const handleFilterRemove = useCallback((key: string) => {
    handleFilterChange(key, 'all');
  }, [handleFilterChange]);

  const columns: DataTableColumn<ScanRow>[] = [
    {
      key: 'repository',
      header: 'Repository',
      render: (row) => (
        <Flex vertical gap={token.marginXXS}>
          <Typography.Link
            onClick={(e) => { e.stopPropagation(); onRepoClick(row); }}
            style={{ fontWeight: 600 }}
          >
            {row.repository}
          </Typography.Link>
          <Flex align="center" gap={token.marginXS}>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {row.repoSub}
            </Typography.Text>
            <Flex align="center" gap={token.marginXXS}>
              <FaIcon icon={row.origin === 'managed' ? 'fa-robot' : 'fa-cloud-arrow-up'} style={{ fontSize: token.fontSizeSM }} />
              <StatusPill variant={row.origin === 'managed' ? 'teal' : 'slate'}>
                {row.origin === 'managed' ? 'Managed' : 'Upload'}
              </StatusPill>
            </Flex>
          </Flex>
        </Flex>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => <StatusTag type="scanStatus" value={row.status} />,
    },
    {
      key: 'stage',
      header: 'Stage',
      sortable: true,
      sortValue: (row) => row.stage,
      render: (row) => <Typography.Text type="secondary">{row.stage}</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      sortValue: (row) => row.durationSeconds ?? 0,
      render: (row) => {
        if (!row.durationSeconds) return <Typography.Text type="secondary">—</Typography.Text>;
        const mins = Math.floor(row.durationSeconds / 60);
        const secs = row.durationSeconds % 60;
        return <Typography.Text type="secondary">{mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}</Typography.Text>;
      },
      hideOnMobile: true,
    },
    {
      key: 'findings',
      header: 'Findings',
      sortable: true,
      sortValue: (row) => row.findings,
      render: (row) => {
        const isTerminal = row.status === 'completed' || row.status === 'failed';
        if (!isTerminal && row.findings === 0) {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        return (
          <Flex gap={token.marginXS} align="baseline">
            <Typography.Text strong={isTerminal} type={isTerminal ? undefined : 'secondary'}>
              {row.findings}
            </Typography.Text>
            {row.critical > 0 && (
              <Typography.Text type="danger" style={{ fontSize: token.fontSizeSM }}>
                {row.critical} critical
              </Typography.Text>
            )}
          </Flex>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'ai',
      header: 'AI',
      render: (row) => <Typography.Text>{row.ai}</Typography.Text>,
      hideOnMobile: true,
    },
  ];

  const actions: ActionConfig<ScanRow>[] = [
    {
      label: 'Retry',
      icon: <FaIcon icon="fa-rotate-right" />,
      show: (row) => row.status === 'failed',
      onClick: (row) => onRetry?.(row),
    },
    {
      label: 'View findings',
      icon: <FaIcon icon="fa-eye" />,
      show: (row) => row.status !== 'failed',
      onClick: (row) => onViewFindings?.(row),
    },
  ];

  if (error) {
    return (
      <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorError }}>
        <FaIcon icon="fa-triangle-exclamation" style={{ fontSize: 24, marginBottom: 8 }} />
        <div>{error}</div>
      </div>
    );
  }

  return (
    <DataTable
      source={{ data: rows, meta: { page, pageSize, total: totalCount } }}
      columns={columns}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      searchable
      searchPlaceholder="Search scans..."
      searchValue={search}
      onSearchChange={(value) => { onSearchChange(value); onPaginationChange(1, pageSize); }}
      filters={[
        { key: 'status', label: 'Status', placeholder: 'All statuses', options: STATUS_OPTIONS },
        { key: 'stage', label: 'Stage', placeholder: 'All stages', options: STAGE_OPTIONS },
        { key: 'origin', label: 'Origin', placeholder: 'All origins', options: ORIGIN_OPTIONS },
      ]}
      filterValues={{ status: statusFilter, stage: stageFilter, origin: originFilter }}
      onFilterChange={handleFilterChange}
      activeFilters={activeFilters}
      onFilterRemove={handleFilterRemove}
      actions={actions}
      emptyText="No scans match the current search."
      onChange={onPaginationChange}
    />
  );
}
