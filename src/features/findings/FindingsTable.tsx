'use client';

import { useState, useMemo, useCallback } from 'react';
import { Checkbox, Button, Typography, Avatar, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { StatusTag } from '@/components/shared/StatusTag';
import type { Finding } from '@/commons/types';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

const { Text } = Typography;

interface FindingsTableProps {
  rows: Finding[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  search?: string;
  filterValues: Record<string, string>;
  onPageChange: (page: number, pageSize: number) => void;
  onSearchChange: (search: string) => void;
  onFilterChange: (key: string, value: string) => void;
  error?: string | null;
  onReview: (row: Finding) => void;
  onAcceptVerdict?: (ids: string[]) => void;
  onReverify?: (ids: string[]) => void;
  onAssign?: (ids: string[]) => void;
  onAssignRow?: (row: Finding) => void;
}

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'CRITICAL' },
  { value: 'high', label: 'HIGH' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'low', label: 'LOW' },
];

const VERDICT_OPTIONS = [
  { value: 'TP', label: 'TP' },
  { value: 'FP', label: 'FP' },
  { value: 'Pending', label: 'Pending' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'fixed', label: 'Fixed' },
];

export function FindingsTable({ rows, isLoading, total, page, pageSize, search, filterValues, onPageChange, onSearchChange, onFilterChange, error, onReview, onAcceptVerdict, onReverify, onAssign, onAssignRow }: FindingsTableProps) {
  const { token } = theme.useToken();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeFilters = useMemo(() => {
    const result = [];
    if (filterValues.severity) {
      const opt = SEVERITY_OPTIONS.find((o) => o.value === filterValues.severity);
      result.push({ key: 'severity', label: 'Severity', value: opt?.label ?? filterValues.severity });
    }
    if (filterValues.verdict) {
      const opt = VERDICT_OPTIONS.find((o) => o.value === filterValues.verdict);
      result.push({ key: 'verdict', label: 'Verdict', value: opt?.label ?? filterValues.verdict });
    }
    if (filterValues.status) {
      const opt = STATUS_OPTIONS.find((o) => o.value === filterValues.status);
      result.push({ key: 'status', label: 'Status', value: opt?.label ?? filterValues.status });
    }
    return result;
  }, [filterValues.severity, filterValues.verdict, filterValues.status]);

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const handleSelectAll = useCallback((checked: boolean) => {
    const next = new Set(selectedIds);
    rows.forEach((r) => {
      if (checked) next.add(r.id); else next.delete(r.id);
    });
    setSelectedIds(next);
  }, [rows, selectedIds]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  }, [selectedIds]);

  const columns: DataTableColumn<Finding>[] = [
    {
      key: 'checkbox',
      header: <Checkbox checked={allVisibleSelected} onChange={(e) => handleSelectAll(e.target.checked)} />,
      render: (row) => (
        <Checkbox checked={selectedIds.has(row.id)} onChange={(e) => handleSelectRow(row.id, e.target.checked)} />
      ),
    },
    {
      key: 'rule',
      header: 'Finding',
      render: (row) => (
        <Flex vertical gap={token.marginXXS} style={{ minWidth: 200 }}>
          <Typography.Link
            onClick={() => onReview(row)}
            style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}
          >
            {row.rule}
          </Typography.Link>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.repo} · {row.file}</Text>
        </Flex>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <StatusTag type="severity" value={row.severity} />,
    },
    {
      key: 'scanner',
      header: 'Scanner',
      render: (row) => <StatusTag type="scanner" value={row.scanner} />,
      hideOnMobile: true,
    },
    {
      key: 'verdict',
      header: 'AI verdict',
      render: (row) => (
        <Flex vertical gap={token.marginXXS}>
          <StatusTag type="verdict" value={row.verdict} />
          {row.model && <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{row.model}</Text>}
        </Flex>
      ),
      hideOnMobile: true,
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
              {(row.assignee ?? '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </Avatar>
            {(row.assignee ?? '').split(' ')[0]}
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
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusTag type="findingStatus" value={row.status} />,
    },
  ] as DataTableColumn<Finding>[];

  const actions: ActionConfig<Finding>[] = [
    {
      label: 'Review',
      icon: <FaIcon icon="fa-eye" />,
      onClick: (row) => onReview(row),
    },
  ];

  const bulkBar = selectedIds.size > 0 ? (
    <Flex align="center" gap={token.marginXS} style={{ padding: `${token.paddingXXS}px ${token.paddingMD}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, minHeight: 38 }}>
      <Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>{selectedIds.size} selected</Text>
      <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
        <Button type="primary" size="small" onClick={() => { onAcceptVerdict?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-check" /> Accept
        </Button>
      </PermissionGate>
      <PermissionGate permission={PERMISSION.SCAN_RUN}>
        <Button size="small" onClick={() => { onReverify?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-brain" /> Re-verify
        </Button>
      </PermissionGate>
      <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
        <Button size="small" onClick={() => { onAssign?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-user-plus" /> Assign
        </Button>
      </PermissionGate>
    </Flex>
  ) : null;

  if (error) {
    return (
      <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorError }}>
        <FaIcon icon="fa-triangle-exclamation" style={{ fontSize: 24, marginBottom: 8 }} />
        <div>{error}</div>
      </div>
    );
  }

  return (
    <>
      {bulkBar}
      <DataTable
        source={{ data: rows, meta: { page, pageSize, total } }}
        columns={columns}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search findings..."
        searchValue={search}
        onSearchChange={onSearchChange}
        filters={[
          { key: 'severity', label: 'Severity', placeholder: 'All severities', options: SEVERITY_OPTIONS },
          { key: 'verdict', label: 'Verdict', placeholder: 'All verdicts', options: VERDICT_OPTIONS },
          { key: 'status', label: 'Status', placeholder: 'All statuses', options: STATUS_OPTIONS },
        ]}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        activeFilters={activeFilters}
        onFilterRemove={(key) => onFilterChange(key, '')}
        actions={actions}
        emptyText="No findings found. Run a scan from the Repositories page."
        onChange={onPageChange}
      />
    </>
  );
}
