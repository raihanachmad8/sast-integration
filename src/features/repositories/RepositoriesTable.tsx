'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Button, Select, Space, Typography, theme } from 'antd';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';

import { DataTable, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { FaIcon } from '@/commons/components/FaIcon';
import { StatusPill } from '@/commons/components/StatusPill';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Repository } from '@/commons/types';
import type { RepositoryExtended } from '@/commons/types/repositories';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { useProjectsQuery } from '@/modules/projects/queries';
import { useRepositoriesQuery, useUpdateRepositoryMutation } from '@/modules/repositories';
import { repositoryKeys } from '@/modules/repositories/keys';

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

/**
 * Paginated data table for listing repositories with status/provider filters and inline project assignment.
 *
 * Uses the shared DataTable with server-side pagination and row-level project editing.
 *
 * @param props - {@link RepositoriesTableProps}
 * @returns JSX element rendering the repositories data table.
 *
 * @example
 * <RepositoriesTable
 *   onRowClick={(repo) => openDetail(repo)}
 *   onAssignProject={(repo) => openAssignModal(repo)}
 * />
 */
export function RepositoriesTable({ onRowClick, onAssignProject: _onAssignProject }: RepositoriesTableProps) {
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateRepositoryMutation();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const { has } = usePermissions();
  const canManage = has(PERMISSION.REPOSITORY_MANAGE);

  const { params, setPagination, setSearch, setFilter, setSort } = useTableParams({
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
    sort: params.sortKey || undefined,
    order: params.sortDir?.toUpperCase() as 'ASC' | 'DESC' | undefined,
  });

  const [projectPage, setProjectPage] = useState(1);
  const [projectSearch, setProjectSearch] = useState('');
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState('');
  const projectsQuery = useProjectsQuery({ page: projectPage, perPage: 100, search: debouncedProjectSearch || undefined });
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string }>>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const d = projectsQuery.data?.data ?? [];
    queueMicrotask(() => {
      if (cancelled) return;
      if (projectPage === 1) {
        // Always reset on page 1, even if empty (for search cleared)
        setAllProjects(d);
      } else if (d.length > 0) {
        // Append on subsequent pages
        setAllProjects((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          return [...prev, ...d.filter((x) => !ids.has(x.id))];
        });
      }
    });
    return () => { cancelled = true; };
  }, [projectsQuery.data, projectPage]);

  // Debounce for project search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedProjectSearch(projectSearch);
      setProjectPage(1);
      setAllProjects([]);
    }, 550);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [projectSearch]);

  const projectOptions = useMemo(() => allProjects.map((p) => ({ value: p.id, label: p.name })), [allProjects]);
  const projectTotal = projectsQuery.data?.meta?.total ?? 0;
  const hasMoreProjects = allProjects.length < projectTotal;

  const handleProjectScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreProjects || projectsQuery.isFetching) return;
    const target = e.target as HTMLDivElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) setProjectPage((p) => p + 1);
  }, [hasMoreProjects, projectsQuery.isFetching]);

  const handleProjectSearch = useCallback((v: string) => {
    setProjectSearch(v);
  }, []);

  const rows = useMemo(() => (query.data?.data ?? []).map((r: RepositoryExtended) => ({
    id: r.id as string,
    name: r.name as string,
    url: r.url as string,
    branch: (r.defaultBranch as string) ?? '',
    status: 'active' as const,
    projectId: (r.projectId as string) ?? null,
    project: (r.projectName as string) ?? '',
    policyName: null,
    connectionType: (Array.isArray(r.connectionType) ? r.connectionType : r.connectionType ? [r.connectionType as string] : ['scm']) as string[],
    provider: (r.provider as 'github' | 'gitlab' | 'gitea') ?? null,
    findings: (r.findingCount as number) ?? 0,
    scans: (r.scanCount as number) ?? 0,
    lastScan: r.lastScan ? new Date(r.lastScan as string).toISOString() : null,
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

  const handleAssignProject = useCallback((repoId: string, projectId: string | null) => {
    if (!workspaceId) return;
    updateMutation.mutate(
      { id: repoId, data: { projectId: projectId ?? undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: repositoryKeys.all });
          setEditingProjectId(null);
        },
      },
    );
  }, [workspaceId, updateMutation, queryClient]);

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
      render: (row) => {
        const isEditing = editingProjectId === row.id;
        if (isEditing) {
          return (
            <Select
              autoFocus
              size="small"
              style={{ width: token.sizeXXL * 3.75 }}
              placeholder="Select project..."
              options={projectOptions}
              value={row.projectId ?? undefined}
              onChange={(val) => handleAssignProject(row.id, val)}
              onBlur={() => setEditingProjectId(null)}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          );
        }
        return row.project ? (
          canManage ? (
            <Button
              type="link"
              size="small"
              onClick={(e) => { e.stopPropagation(); setEditingProjectId(row.id); }}
              style={{ padding: 0, height: 'auto', fontSize: token.fontSize, textAlign: 'left' }}
            >
              {row.project}
            </Button>
          ) : (
            <Typography.Text style={{ fontSize: token.fontSize }}>{row.project}</Typography.Text>
          )
        ) : (
          canManage ? (
            <Button
              type="link"
              size="small"
              onClick={(e) => { e.stopPropagation(); setEditingProjectId(row.id); }}
              style={{ padding: '0 4px', height: 'auto', fontSize: token.fontSize, color: token.colorTextSecondary, borderStyle: 'dashed', borderWidth: 1, borderColor: token.colorBorderSecondary }}
            >
              <FaIcon icon="fa-folder-plus" style={{ marginRight: 4 }} /> Assign
            </Button>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSize }}>—</Typography.Text>
          )
        );
      },
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
      key: 'connectionType',
      header: 'Type',
      render: (row) => (
        <Space size={[4, 4]} wrap>
          {row.connectionType?.includes('scm') && (
            <StatusPill variant="blue">SCM</StatusPill>
          )}
          {row.connectionType?.includes('external') && (
            <StatusPill variant="amber">Upload</StatusPill>
          )}
        </Space>
      ),
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
        { key: 'project', label: 'Project', placeholder: 'All projects', options: projectOptions, onSearch: handleProjectSearch, onScroll: handleProjectScroll, isFetching: projectsQuery.isFetching, hasMore: hasMoreProjects },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No repositories found. Try a different search term or filter."
      onChange={(p, ps) => setPagination(p, ps)}
      sort={params.sortKey && params.sortDir ? { key: params.sortKey, dir: params.sortDir } : null}
      onSortChange={(s) => setSort(s?.key ?? '', s?.dir ?? '')}
    />
  );
}
