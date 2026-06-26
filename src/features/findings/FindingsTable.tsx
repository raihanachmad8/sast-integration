'use client';

import { useState, useMemo, useCallback } from 'react';
import { Checkbox, Button, Typography, Avatar, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { StatusTag } from '@/commons/components/StatusTag';
import type { Finding } from '@/commons/types';
import { PermissionGate } from '@/commons/components/PermissionGate';
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
  onReview: (row: Finding) => void;
  onDismiss?: (ids: string[]) => void;
  onResolve?: (ids: string[]) => void;
  onReverify?: (ids: string[]) => void;
  onAssign?: (ids: string[]) => void;
  onAssignRow?: (row: Finding) => void;
  members?: Array<{ userId: string; name: string; email: string }>;
  projectOptions?: Array<{ value: string; label: string }>;
  repositoryOptions?: Array<{ value: string; label: string }>;
  sort?: { key: string; dir: 'asc' | 'desc' } | null;
  onSortChange?: (sort: { key: string; dir: 'asc' | 'desc' } | null) => void;
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
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'resolved', label: 'Resolved' },
];

/**
 * Paginated data table for listing findings with severity/verdict/status filters, bulk actions, and sorting.
 *
 * Supports row selection for bulk dismiss/resolve/reverify/assign, and inline per-row actions.
 *
 * @param props - {@link FindingsTableProps}
 * @returns JSX element rendering the findings data table with filters, bulk actions, and sort controls.
 *
 * @example
 * <FindingsTable
 *   rows={findingRows}
 *   isLoading={false}
 *   total={50}
 *   page={1}
 *   pageSize={10}
 *   filterValues={{}}
 *   onPageChange={(p, s) => setPagination(p, s)}
 *   onSearchChange={setSearch}
 *   onFilterChange={(k, v) => setFilter(k, v)}
 *   onReview={(row) => openReview(row)}
 * />
 */
export function FindingsTable({ rows, isLoading, total, page, pageSize, search, filterValues, onPageChange, onSearchChange, onFilterChange, onReview, onDismiss, onResolve, onReverify, onAssign, onAssignRow, members, projectOptions = [], repositoryOptions = [], sort, onSortChange }: FindingsTableProps) {
  const { token } = theme.useToken();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeFilters = useMemo(() => {
    const result = [];
    if (filterValues.project) {
      const opt = projectOptions.find((o) => o.value === filterValues.project);
      result.push({ key: 'project', label: 'Project', value: opt?.label ?? filterValues.project });
    }
    if (filterValues.repository) {
      const opt = repositoryOptions.find((o) => o.value === filterValues.repository);
      result.push({ key: 'repository', label: 'Repository', value: opt?.label ?? filterValues.repository });
    }
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
  }, [filterValues.project, filterValues.repository, filterValues.severity, filterValues.verdict, filterValues.status, projectOptions, repositoryOptions]);

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    members?.forEach((m) => map.set(m.userId, { name: m.name, email: m.email }));
    return map;
  }, [members]);

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
      sortable: true,
      render: (row) => <StatusTag type="severity" value={row.severity} />,
    },
    {
      key: 'scanner',
      header: 'Scanner',
      sortable: true,
      render: (row) => <StatusTag type="scanner" value={row.scanner} />,
      hideOnMobile: true,
    },
    {
      key: 'verdict',
      header: 'AI verdict',
      sortable: true,
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
      render: (row) => {
        const member = row.assignee ? memberMap.get(row.assignee) : undefined;
        const displayName = member?.name ?? row.assignee ?? '';
        const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          row.assignee ? (
            <Button
              size="small"
              onClick={() => onAssignRow?.(row)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: token.marginXXS }}
            >
              <Avatar size={20} style={{ background: token.colorText, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {initials}
              </Avatar>
              {displayName.split(' ')[0]}
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
        );
      },
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
    <Flex align="center" gap={token.marginXS} style={{ padding: `${token.paddingXXS}px ${token.paddingMD}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, minHeight: token.controlHeightSM }}>
      <Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>{selectedIds.size} selected</Text>
      <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
        <Button type="primary" onClick={() => { onDismiss?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-check" /> Dismiss
        </Button>
        <Button onClick={() => { onResolve?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-circle-check" /> Resolve
        </Button>
      </PermissionGate>
      <PermissionGate permission={PERMISSION.SCAN_RUN}>
        <Button onClick={() => { onReverify?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-brain" /> Re-verify
        </Button>
      </PermissionGate>
      <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
        <Button onClick={() => { onAssign?.([...selectedIds]); setSelectedIds(new Set()); }}>
          <FaIcon icon="fa-user-plus" /> Assign
        </Button>
      </PermissionGate>
    </Flex>
  ) : null;

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
          { key: 'project', label: 'Project', placeholder: 'All projects', options: projectOptions, searchable: true },
          { key: 'repository', label: 'Repository', placeholder: 'All repositories', options: repositoryOptions, searchable: true },
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
        sort={sort}
        onSortChange={onSortChange}
      />
    </>
  );
}
