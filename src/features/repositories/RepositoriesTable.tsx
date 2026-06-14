'use client';

import { useMemo } from 'react';
import { Button, Typography, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useRepositoriesQuery } from '@/modules/repositories';
import type { Repository } from '@/commons/types';

interface RepositoriesTableProps {
  onRowClick: (row: Repository) => void;
  onAssignProject?: (row: Repository) => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' },
];

const PROVIDER_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'gitea', label: 'Gitea' },
];

const STATUS_VARIANT: Record<string, 'teal' | 'slate' | 'red'> = {
  active: 'teal',
  inactive: 'slate',
  error: 'red',
};

const PROVIDER_VARIANT: Record<string, 'blue' | 'teal' | 'purple' | 'slate'> = {
  github: 'blue',
  gitlab: 'purple',
  gitea: 'teal',
};

export function RepositoriesTable({ onRowClick, onAssignProject }: RepositoriesTableProps) {
  const { token } = theme.useToken();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['status', 'provider', 'project'],
    defaultPageSize: 10,
  });

  const query = useRepositoriesQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    status: params.filters.status || undefined,
    provider: params.filters.provider || undefined,
    project: params.filters.project || undefined,
    imported: true,
  });

  const rows = useMemo(() => (query.data?.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    url: r.url as string,
    branch: (r.default_branch as string) ?? '',
    status: 'active' as const,
    project: (r.project_name as string) ?? '',
    policyName: null,
    connectionType: ((r.connection_type as string) ?? 'scm') as 'scm' | 'external',
    provider: (r.provider as 'github' | 'gitlab' | 'gitea') ?? null,
    findings: 0,
    scans: 0,
    lastScan: null,
  } satisfies Repository)), [query.data?.data]);

  const activeFilters = useMemo(() => {
    const filters = [];
    if (params.filters.status) {
      const opt = STATUS_OPTIONS.find((o) => o.value === params.filters.status);
      filters.push({ key: 'status', label: 'Status', value: opt?.label ?? params.filters.status });
    }
    if (params.filters.provider) {
      const opt = PROVIDER_OPTIONS.find((o) => o.value === params.filters.provider);
      filters.push({ key: 'provider', label: 'Provider', value: opt?.label ?? params.filters.provider });
    }
    if (params.filters.project) {
      filters.push({ key: 'project', label: 'Project', value: params.filters.project });
    }
    return filters;
  }, [params.filters.status, params.filters.provider, params.filters.project]);

  const columns: DataTableColumn<Repository>[] = [
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
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            {row.branch}
          </div>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (row) => row.project
        ? <Typography.Text style={{ fontSize: token.fontSize, color: token.colorText }}>{row.project}</Typography.Text>
        : <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>—</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => row.provider
        ? <StatusPill variant={PROVIDER_VARIANT[row.provider] ?? 'slate'}>{row.provider}</StatusPill>
        : <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>—</Typography.Text>,
      hideOnMobile: true,
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
      key: 'findings',
      header: 'Findings',
      sortable: true,
      sortValue: (row) => row.findings,
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.findings}</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'scans',
      header: 'Scans',
      sortable: true,
      sortValue: (row) => row.scans,
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.scans}</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'lastScan',
      header: 'Last Scan',
      render: (row) => (
        <Typography.Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
          {row.lastScan ?? 'Never'}
        </Typography.Text>
      ),
      hideOnMobile: true,
    },
  ];

  const actions: ActionConfig<Repository>[] = [
    {
      label: 'View',
      icon: <FaIcon icon="fa-eye" />,
      onClick: (row) => onRowClick(row),
    },
    ...(onAssignProject ? [{
      label: 'Assign Project',
      icon: <FaIcon icon="fa-folder-plus" />,
      onClick: (row: Repository) => onAssignProject(row),
      show: (row: Repository) => !row.project,
    }] : []),
  ];

  return (
    <DataTable
      source={{ data: rows, meta: { page: params.page, pageSize: params.perPage, total: query.data?.meta.total ?? 0 } }}
      columns={columns}
      rowKey={(r) => r.id}
      isLoading={query.isLoading}
      searchable
      searchPlaceholder="Search repositories..."
      searchValue={params.search}
      onSearchChange={setSearch}
      filters={[
        { key: 'status', label: 'Status', placeholder: 'All statuses', options: STATUS_OPTIONS },
        { key: 'provider', label: 'Provider', placeholder: 'All providers', options: PROVIDER_OPTIONS },
        { key: 'project', label: 'Project', placeholder: 'All projects', options: [], searchable: true },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No repositories found. Try a different search term or filter."
      onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
    />
  );
}
