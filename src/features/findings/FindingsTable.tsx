'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input, Select, Card, Checkbox, Button, Typography, Avatar, Flex, Row, Col, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { TableFooter } from '@/components/shared/TableFooter';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusTag } from '@/components/shared/StatusTag';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { Finding } from '@/commons/types';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

const { Text } = Typography;

interface FindingsTableProps {
  rows: Finding[];
  isLoading: boolean;
  error?: string | null;
  onReview: (row: Finding) => void;
  onAcceptVerdict?: (ids: string[]) => void;
  onReverify?: (ids: string[]) => void;
  onAssign?: (ids: string[]) => void;
  onAssignRow?: (row: Finding) => void;
}

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'critical', label: 'CRITICAL' },
  { value: 'high', label: 'HIGH' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'low', label: 'LOW' },
];

const VERDICT_OPTIONS = [
  { value: 'all', label: 'All verdicts' },
  { value: 'TP', label: 'TP' },
  { value: 'FP', label: 'FP' },
  { value: 'Pending', label: 'Pending' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'fixed', label: 'Fixed' },
];

export function FindingsTable({ rows, isLoading, error, onReview, onAcceptVerdict, onReverify, onAssign, onAssignRow }: FindingsTableProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q || `${r.rule} ${r.file} ${r.repo} ${r.cwe}`.toLowerCase().includes(q);
      const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
      const matchesVerdict = verdictFilter === 'all' || r.verdict === verdictFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesVerdict && matchesStatus;
    });
  }, [rows, debouncedSearch, severityFilter, verdictFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allVisibleSelected = paginated.length > 0 && paginated.every((r) => selectedIds.has(r.id));

  const handleSelectAll = useCallback((checked: boolean) => {
    const next = new Set(selectedIds);
    paginated.forEach((r) => {
      if (checked) next.add(r.id); else next.delete(r.id);
    });
    setSelectedIds(next);
  }, [paginated, selectedIds]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  }, [selectedIds]);

  const handleBulkAccept = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    onAcceptVerdict?.(ids);
  };

  const handleBulkReverify = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    onReverify?.(ids);
  };

  const handleBulkAssign = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    onAssign?.(ids);
  };

  const columns: DataTableColumn<Finding>[] = [
    {
      key: 'checkbox',
      header: <Checkbox checked={allVisibleSelected} onChange={(e) => handleSelectAll(e.target.checked)} />,
      render: (row) => (
        <Checkbox checked={selectedIds.has(row.id)} onChange={(e) => handleSelectRow(row.id, e.target.checked)} />
      ),
      className: 'col-checkbox',
    },
    {
      key: 'rule',
      header: 'Finding',
      render: (row) => (
        <Flex vertical gap={2} style={{ minWidth: 200 }}>
          <Typography.Link
            onClick={() => onReview(row)}
            style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}
          >
            {row.rule}
          </Typography.Link>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.repo} · {row.file}</Text>
        </Flex>
      ),
      sortable: true,
      sortValue: (r) => r.rule,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <StatusTag type="severity" value={row.severity} />,
      sortable: true,
      sortValue: (r) => r.severity,
    },
    {
      key: 'scanner',
      header: 'Scanner',
      render: (row) => <StatusTag type="scanner" value={row.scanner} />,
    },
    {
      key: 'verdict',
      header: 'AI verdict',
      render: (row) => (
        <Flex align="center" gap={token.marginXXS} wrap="nowrap">
          <StatusTag type="verdict" value={row.verdict} />
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, whiteSpace: 'nowrap' }}>{row.model}</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (row) => (
        row.assignee ? (
          <Button
            size="small"
            onClick={() => onAssignRow?.(row)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: token.marginXXS }}
          >
            <Avatar size={20} style={{ background: token.colorText, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {row.assignee.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </Avatar>
            {row.assignee.split(' ')[0]}
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() => onAssignRow?.(row)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: token.marginXXS, borderStyle: 'dashed' }}
          >
            <FaIcon icon="fa-user-plus" style={{ fontSize: token.fontSizeSM }} /> Assign
          </Button>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusTag type="findingStatus" value={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="small" onClick={() => onReview(row)}>
          <FaIcon icon="fa-eye" /> Review
        </Button>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: 0 } }}>
      {selectedIds.size > 0 ? (
        <Flex align="center" gap={8} style={{ padding: `${token.paddingXXS}px ${token.paddingMD}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, minHeight: 38 }}>
          <Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>{selectedIds.size} selected</Text>
          <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
            <Button type="primary" size="small" onClick={handleBulkAccept}>
              <FaIcon icon="fa-check" /> Accept
            </Button>
          </PermissionGate>
          <PermissionGate permission={PERMISSION.SCAN_RUN}>
            <Button size="small" onClick={handleBulkReverify}>
              <FaIcon icon="fa-brain" /> Re-verify
            </Button>
          </PermissionGate>
          <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
            <Button size="small" onClick={handleBulkAssign}>
              <FaIcon icon="fa-user-plus" /> Assign
            </Button>
          </PermissionGate>
        </Flex>
      ) : null}

      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={24} md={8} lg={6}>
            <Input
              allowClear
              style={{ width: '100%' }}
              placeholder="Search findings"
              prefix={<FaIcon icon="fa-magnifying-glass" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </Col>
          <Col xs={12} sm={12} md={5} lg={6}>
            <Select style={{ width: '100%' }} value={severityFilter} onChange={(v) => { setSeverityFilter(v); setPage(1); }} options={SEVERITY_OPTIONS} />
          </Col>
          <Col xs={12} sm={12} md={5} lg={6}>
            <Select style={{ width: '100%' }} value={verdictFilter} onChange={(v) => { setVerdictFilter(v); setPage(1); }} options={VERDICT_OPTIONS} />
          </Col>
          <Col xs={12} sm={12} md={5} lg={6}>
            <Select style={{ width: '100%' }} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={STATUS_OPTIONS} />
          </Col>
        </Row>
      </div>

      {error ? (
        <ErrorState title="Failed to load findings" description={error} />
      ) : isLoading ? (
        <LoadingState text="Loading findings..." />
      ) : paginated.length > 0 ? (
        <>
          <DataTable
            data={paginated}
            columns={columns}
            rowKey={(r) => r.id}
          />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : (
        <EmptyState
          icon="fa-magnifying-glass"
          title="No findings"
          text="Findings appear after a scan completes. Run a scan from the Repositories page."
          action={
            <Button type="primary">
              <FaIcon icon="fa-plus" /> Go to Repositories
            </Button>
          }
        />
      )}
    </Card>
  );
}
