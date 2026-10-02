'use client';

import { useState, useMemo } from 'react';
import { Input, Select, Card, Button, Typography, Flex, Row, Col, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusPill } from '@/components/shared/StatusPill';
import { StatusTag } from '@/components/shared/StatusTag';
import type { ScanRow } from './types';

/** Props for the ScanTable component. */
interface ScanTableProps {
  /** Array of scan row objects to display. */
  rows: ScanRow[];
  /** Total number of scans across all pages. */
  totalCount: number;
  /** Current search query string. */
  search: string;
  /** Callback triggered when the search input changes. */
  onSearchChange: (value: string) => void;
  /** Currently selected status filter value. */
  statusFilter: string;
  /** Callback triggered when the status filter changes. */
  onStatusFilterChange: (value: string) => void;
  /** Currently selected connection type filter value. */
  connectionTypeFilter: string;
  /** Callback triggered when the connection type filter changes. */
  onConnectionTypeFilterChange: (value: string) => void;
  /** Currently selected origin filter value. */
  originFilter: string;
  /** Callback triggered when the origin filter changes. */
  onOriginFilterChange: (value: string) => void;
  /** Callback triggered when a repository name is clicked. */
  onRepoClick: (row: ScanRow) => void;
  /** Callback triggered when the retry button is clicked. */
  onRetry?: (row: ScanRow) => void;
  /** Callback triggered when the view findings button is clicked. */
  onViewFindings?: (row: ScanRow) => void;
  /** Whether the table is currently loading. */
  isLoading?: boolean;
  /** Error message to display when data loading fails. */
  error?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Running', label: 'Running' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Failed', label: 'Failed' },
];

const CONNECTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'scm', label: 'SCM (Managed)' },
  { value: 'external', label: 'External (CI)' },
];

const ORIGIN_OPTIONS = [
  { value: 'all', label: 'All origins' },
  { value: 'managed', label: 'Managed' },
  { value: 'external_upload', label: 'External Upload' },
];

/**
 * Build column definitions for the scan data table.
 * The repository column renders a clickable button that triggers the detail drawer.
 *
 * @param onRepoClick - Callback when a repository name is clicked.
 * @param onRetry - Optional callback for retry action.
 * @param onViewFindings - Optional callback for view findings action.
 * @returns Array of DataTableColumn definitions.
 */
function buildColumns(
  onRepoClick: (row: ScanRow) => void,
  onRetry?: (row: ScanRow) => void,
  onViewFindings?: (row: ScanRow) => void,
): DataTableColumn<ScanRow>[] {
  const { token } = theme.useToken();
  return [
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
    },
    {
      key: 'findings',
      header: 'Findings',
      sortable: true,
      sortValue: (row) => row.findings,
      render: (row) => (
        <Flex gap={token.marginXS} align="baseline">
          <Typography.Text strong>{row.findings}</Typography.Text>
          {row.critical > 0 && (
            <Typography.Text type="danger" style={{ fontSize: token.fontSizeSM }}>
              {row.critical} critical
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      key: 'ai',
      header: 'AI',
      render: (row) => <Typography.Text>{row.ai}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end">
          {row.status === 'Failed' ? (
            <Button size="small" onClick={(e) => { e.stopPropagation(); onRetry?.(row); }}>
              <FaIcon icon="fa-rotate-right" /> Retry
            </Button>
          ) : (
            <Button size="small" onClick={(e) => { e.stopPropagation(); onViewFindings?.(row); }}>
              <FaIcon icon="fa-eye" /> View findings
            </Button>
          )}
        </Flex>
      ),
    },
  ];
}

/**
 * Renders a searchable, filterable data table of scan results.
 *
 * Supports three filter dimensions: status, connection type, and origin.
 * On mobile, filters stack vertically (consistent with members page).
 *
 * Repository names are clickable buttons that open the detail drawer.
 * The table row itself is not clickable — only the repo name triggers navigation.
 *
 * @param props - {@link ScanTableProps}
 * @returns A surface card containing the toolbar, data table, and footer.
 *
 * @example
 * <ScanTable
 *   rows={scanRows}
 *   totalCount={50}
 *   search=""
 *   onSearchChange={setSearch}
 *   statusFilter="all"
 *   onStatusFilterChange={setStatusFilter}
 *   connectionTypeFilter="all"
 *   onConnectionTypeFilterChange={setConnectionTypeFilter}
 *   originFilter="all"
 *   onOriginFilterChange={setOriginFilter}
 *   onRepoClick={(row) => openDetail(row)}
 *   onRetry={(row) => retryScan(row)}
 *   onViewFindings={(row) => openFindings(row)}
 * />
 */
export function ScanTable({
  rows,
  totalCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  connectionTypeFilter,
  onConnectionTypeFilterChange,
  originFilter,
  onOriginFilterChange,
  onRepoClick,
  onRetry,
  onViewFindings,
  isLoading = false,
  error = null,
}: ScanTableProps) {
  const { token } = theme.useToken();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const columns = buildColumns(onRepoClick, onRetry, onViewFindings);

  const paginated = useMemo(() => {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [rows, page, pageSize]);

  const handleChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  };

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap="middle"
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          padding: 12,
        }}
      >
        <Row gutter={[token.marginSM, token.marginSM]} style={{ flex: 1, minWidth: 0 }}>
          <Col xs={24} sm={24} md={10} lg={8}>
            <Input
              allowClear
              style={{ width: '100%', maxWidth: 360 }}
              placeholder="Search scans"
              prefix={<FaIcon icon="fa-magnifying-glass" />}
              value={search}
              onChange={(e) => { onSearchChange(e.target.value); setPage(1); }}
            />
          </Col>
          <Col xs={12} sm={12} md={5} lg={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => { onStatusFilterChange(v); setPage(1); }}
              options={STATUS_OPTIONS}
            />
          </Col>
          <Col xs={12} sm={12} md={5} lg={5}>
            <Select
              style={{ width: '100%' }}
              value={connectionTypeFilter}
              onChange={(v) => { onConnectionTypeFilterChange(v); setPage(1); }}
              options={CONNECTION_TYPE_OPTIONS}
            />
          </Col>
          <Col xs={12} sm={12} md={4} lg={5}>
            <Select
              style={{ width: '100%' }}
              value={originFilter}
              onChange={(v) => { onOriginFilterChange(v); setPage(1); }}
              options={ORIGIN_OPTIONS}
            />
          </Col>
        </Row>
      </Flex>

      {error ? (
        <ErrorState title="Failed to load scans" description={error} />
      ) : isLoading ? (
        <LoadingState text="Loading scans..." />
      ) : paginated.length > 0 ? (
        <>
          <DataTable
              data={paginated}
              columns={columns}
              rowKey={(row) => row.id}
              emptyText="No scans match the current search."
            />
          <TableFooter current={page} pageSize={pageSize} total={rows.length} onChange={handleChange} />
        </>
      ) : (
        <EmptyState
          icon="fa-microscope"
          title="No scans found"
          text="Run a scan from the Repositories page or adjust your filters."
        />
      )}
    </Card>
  );
}
