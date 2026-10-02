'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select, Card, Typography, Flex, Row, Col, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusPill } from '@/components/shared/StatusPill';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { Repository } from '@/commons/types';

interface RepositoriesTableProps {
  rows: Repository[];
  isLoading: boolean;
  error?: string | null;
  onRowClick: (row: Repository) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'scm', label: 'SCM (Managed)' },
  { value: 'external', label: 'External (CI)' },
];

const STATUS_VARIANT: Record<string, 'teal' | 'slate' | 'red'> = {
  active: 'teal',
  inactive: 'slate',
  error: 'red',
};

function buildColumns(onRowClick: (row: Repository) => void): DataTableColumn<Repository>[] {
  const { token } = theme.useToken();
  return [
    {
      key: 'name',
      header: 'Repository',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <div>
          <Button type="link" onClick={(e) => { e.stopPropagation(); onRowClick(row); }} style={{ padding: 0, height: 'auto' }}>
            {row.name}
          </Button>
          <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
            {row.branch} • {row.project}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusPill variant={STATUS_VARIANT[row.status] ?? 'slate'}>
          {row.status}
        </StatusPill>
      ),
    },
    {
      key: 'policy',
      header: 'Policy',
      render: (row) => row.policyName
        ? <Typography.Text style={{ fontSize: token.fontSize, color: token.colorText }}>{row.policyName}</Typography.Text>
        : <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>None</Typography.Text>,
    },
    {
      key: 'findings',
      header: 'Findings',
      sortable: true,
      sortValue: (row) => row.findings,
      render: (row) => (
        <Typography.Text style={{ color: token.colorTextSecondary }}>{row.findings}</Typography.Text>
      ),
    },
    {
      key: 'scans',
      header: 'Scans',
      sortable: true,
      sortValue: (row) => row.scans,
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.scans}</Typography.Text>,
    },
    {
      key: 'lastScan',
      header: 'Last Scan',
      render: (row) => (
        <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
          {row.lastScan ?? 'Never'}
        </Typography.Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); onRowClick(row); }}>
            <FaIcon icon="fa-eye" /> View
          </Button>
        </Flex>
      ),
    },
  ];
}

export function RepositoriesTable({ rows, isLoading, error = null, onRowClick }: RepositoriesTableProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q || `${r.name} ${r.url} ${r.project}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesType = typeFilter === 'all' || r.connectionType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rows, debouncedSearch, statusFilter, typeFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const columns = buildColumns(onRowClick);

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
        <Row gutter={[12, 12]} style={{ flex: 1, minWidth: 0 }}>
          <Col xs={24} sm={24} md={10} lg={8}>
            <Input
              allowClear
              style={{ width: '100%', maxWidth: 360 }}
              placeholder="Search repositories"
              prefix={<FaIcon icon="fa-magnifying-glass" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </Col>
          <Col xs={12} sm={12} md={7} lg={8}>
            <Select style={{ width: '100%' }} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={STATUS_OPTIONS} />
          </Col>
          <Col xs={12} sm={12} md={7} lg={8}>
            <Select style={{ width: '100%' }} value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} options={TYPE_OPTIONS} />
          </Col>
        </Row>
      </Flex>

      {error ? (
        <ErrorState title="Failed to load repositories" description={error} />
      ) : isLoading ? (
        <LoadingState text="Loading repositories..." />
      ) : paginated.length > 0 ? (
        <>
          <DataTable
              data={paginated}
              columns={columns}
              rowKey={(r) => r.id}
              emptyText="No repositories match the current filters."
            />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : (
        <EmptyState icon="fa-code-branch" title="No repositories found" text="Try a different search term or filter." />
      )}
    </Card>
  );
}
