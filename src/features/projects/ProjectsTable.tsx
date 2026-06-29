'use client';

import { Typography, Flex, theme } from 'antd';
import { useMemo } from 'react';

import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { StatusPill } from '@/commons/components/StatusPill';
import type { Project } from '@/commons/types';
import { useLazySelect } from '@/lib/hooks/useLazySelect';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { useProjectsQuery } from '@/modules/projects';
import { repositoriesApi } from '@/modules/repositories/api';
import { repositoryKeys } from '@/modules/repositories/keys';
import { teamsApi } from '@/modules/teams/api';
import { teamKeys } from '@/modules/teams/keys';

interface ProjectsTableProps {
  onView: (project: Project) => void;
}

/**
 * Paginated data table for listing projects with repository, team, and member filters.
 *
 * Uses shared DataTable with server-side pagination, lazy-loaded filter dropdowns,
 * and row click to view details.
 */
export function ProjectsTable({ onView }: ProjectsTableProps) {
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();

  const { params, setPagination, setSearch, setFilter, setSort } = useTableParams({
    filterKeys: ['repository', 'team', 'member'],
    defaultPageSize: 10,
  });

  const query = useProjectsQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    repository: params.filters.repository || undefined,
    team: params.filters.team || undefined,
    member: params.filters.member || undefined,
    sort: (params.sortKey || undefined) as 'members' | 'name' | 'createdAt' | 'repositories' | 'teams' | undefined,
    order: (params.sortDir?.toUpperCase() as 'ASC' | 'DESC') ?? 'DESC',
  });

  // Lazy-loaded filter options via useLazySelect
  const repos = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => repositoriesApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (r) => r.id,
    getLabel: (r) => r.name,
    baseKey: repositoryKeys.all,
  });

  const teams = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => teamsApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (t) => t.id,
    getLabel: (t) => t.name,
    baseKey: teamKeys.all,
  });

  const members = useLazySelect<{ userId: string; name: string; email: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => membersApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    baseKey: memberKeys.all,
  });

  const activeFilters = useMemo(() => {
    const filters = [];
    if (params.filters.repository) {
      const opt = repos.options.find((o) => o.value === params.filters.repository);
      filters.push({ key: 'repository', label: 'Repository', value: opt?.label ?? params.filters.repository });
    }
    if (params.filters.team) {
      const opt = teams.options.find((o) => o.value === params.filters.team);
      filters.push({ key: 'team', label: 'Team', value: opt?.label ?? params.filters.team });
    }
    if (params.filters.member) {
      const opt = members.options.find((o) => o.value === params.filters.member);
      filters.push({ key: 'member', label: 'Member', value: opt?.label ?? params.filters.member });
    }
    return filters;
  }, [params.filters.repository, params.filters.team, params.filters.member, repos.options, teams.options, members.options]);

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      render: (project) => (
        <div>
          <Typography.Link
            onClick={(e) => { e.stopPropagation(); onView(project); }}
            style={{ fontWeight: token.fontWeightStrong }}
          >
            {project.name}
          </Typography.Link>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            {project.description}{project.lead ? ` · ${project.lead}` : ''}
          </div>
        </div>
      ),
      sortable: true,
      sortValue: (p) => p.name,
    },
    {
      key: 'repositories',
      header: 'Repositories',
      render: (project) => <Chips items={project.repositories} variant="slate" max={3} emptyLabel="No Repository" />,
      hideOnMobile: true,
      sortable: true,
      sortValue: (p) => p.repositories?.[0]?.name ?? '',
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (project) => <Chips items={project.teams} variant="slate" max={3} emptyLabel="No Team" />,
      hideOnMobile: true,
      sortable: true,
      sortValue: (p) => p.teams?.[0]?.name ?? '',
    },
    {
      key: 'members',
      header: 'Members',
      render: (project) => <Chips items={project.members} variant="slate" max={3} emptyLabel="No Member" />,
      hideOnMobile: true,
      sortable: true,
      sortValue: (p) => p.members?.[0]?.name ?? '',
    },
  ];

  const actions: ActionConfig<Project>[] = [
    {
      label: 'View',
      icon: <FaIcon icon="fa-eye" />,
      onClick: (project) => onView(project),
    },
  ];

  if (query.isError) {
    return <ErrorState title="Failed to load projects" description="An error occurred while loading projects." onRetry={() => query.refetch()} />;
  }

  return (
    <DataTable
      source={makeSource(query.data)}
      columns={columns}
      rowKey={(p) => p.id}
      isLoading={query.isLoading}
      searchable
      searchPlaceholder="Search projects by name, description, or lead..."
      searchValue={params.search}
      onSearchChange={setSearch}
      filters={[
        { key: 'repository', label: 'Repository', placeholder: 'All repositories', options: repos.options, onSearch: repos.handleSearch, onScroll: repos.handleScroll, isFetching: repos.isFetchingNextPage, hasMore: repos.hasNextPage },
        { key: 'team', label: 'Team', placeholder: 'All teams', options: teams.options, onSearch: teams.handleSearch, onScroll: teams.handleScroll, isFetching: teams.isFetchingNextPage, hasMore: teams.hasNextPage },
        { key: 'member', label: 'Member', placeholder: 'All members', options: members.options, onSearch: members.handleSearch, onScroll: members.handleScroll, isFetching: members.isFetchingNextPage, hasMore: members.hasNextPage },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No projects found. Create your first project to organize repositories."
      onChange={(p, ps) => setPagination(p, ps)}
      sort={params.sortKey && params.sortDir ? { key: params.sortKey, dir: params.sortDir } : null}
      onSortChange={(s) => setSort(s?.key ?? '', s?.dir ?? '')}
    />
  );
}

function Chips<T extends { id: string; name: string }>({ items, count, variant, max, emptyLabel = '—' }: { items?: T[]; count?: number; variant: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'; max: number; emptyLabel?: string }) {
  const { token } = theme.useToken();
  if (!items || items.length === 0) {
    if (count && count > 0) return <Typography.Text style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>{count} item{count !== 1 ? 's' : ''}</Typography.Text>;
    return <Typography.Text type="secondary">{emptyLabel}</Typography.Text>;
  }
  return (
    <Flex wrap="wrap" gap={token.marginXXS}>
      {items.slice(0, max).map((item) => <StatusPill key={item.id} variant={variant}>{item.name}</StatusPill>)}
      {items.length > max && <StatusPill variant="blue">+{items.length - max}</StatusPill>}
    </Flex>
  );
}
