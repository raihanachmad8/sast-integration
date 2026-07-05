'use client';

import { Typography, Flex, theme } from 'antd';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';

import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { StatusPill } from '@/commons/components/StatusPill';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Team } from '@/commons/types';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useProjectsQuery } from '@/modules/projects/queries';
import { useTeamsQuery } from '@/modules/teams';

interface TeamsTableProps {
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

const VALID_TEAM_SORT_KEYS = ['name', 'createdAt', 'updatedAt'] as const;
type TeamSortKey = (typeof VALID_TEAM_SORT_KEYS)[number];

function isTeamSortKey(key: string | undefined): key is TeamSortKey {
  return VALID_TEAM_SORT_KEYS.includes(key as TeamSortKey);
}

/**
 * Paginated data table for listing teams with project filter and row actions.
 *
 * Uses the shared DataTable with server-side pagination and permission-gated edit action.
 *
 * @param props - {@link TeamsTableProps}
 * @returns JSX element rendering the teams data table.
 *
 * @example
 * <TeamsTable
 *   onView={(team) => openDetail(team)}
 *   onEdit={(team) => openEdit(team)}
 * />
 */
export function TeamsTable({ onView, onEdit, onDelete }: TeamsTableProps) {
  const { token } = theme.useToken();
  const { has } = usePermissions();
  const canManage = has(PERMISSION.TEAM_MANAGE);

  const { params, setPagination, setSearch, setFilter, setSort } = useTableParams({
    filterKeys: ['project'],
    defaultPageSize: 10,
  });

  const query = useTeamsQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || '',
    project: params.filters.project || undefined,
    sort: isTeamSortKey(params.sortKey) ? params.sortKey : undefined,
    order: params.sortDir?.toLowerCase() as 'asc' | 'desc' | undefined,
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
        // On page 1, always reset (including when results are empty)
        setAllProjects(d);
      } else if (d.length > 0) {
        // On pages beyond 1 with data, append
        setAllProjects((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          return [...prev, ...d.filter((x) => !ids.has(x.id))];
        });
      }
    });
    return () => { cancelled = true; };
  }, [projectsQuery.data, projectPage]);

  // Debounce project search (same as useTableParams)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedProjectSearch(projectSearch);
      setProjectPage(1);
      setAllProjects([]);
    }, 550);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [projectSearch]);

  const projectOptions = allProjects.map((p) => ({ value: p.id, label: p.name }));
  const projectTotal = projectsQuery.data?.meta?.total ?? 0;
  const hasMoreProjects = allProjects.length < projectTotal;

  const handleProjectScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreProjects || projectsQuery.isFetching) return;
    const target = e.target as HTMLDivElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
      setProjectPage((p) => p + 1);
    }
  }, [hasMoreProjects, projectsQuery.isFetching]);

  const handleProjectSearch = useCallback((v: string) => {
    setProjectSearch(v);
  }, []);

  const activeFilters = useMemo(() => {
    if (!params.filters.project) return [];
    return [{ key: 'project', label: 'Project', value: params.filters.project }];
  }, [params.filters.project]);

  const columns: DataTableColumn<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      render: (team) => (
        <div>
          <Typography.Link
            onClick={(e) => { e.stopPropagation(); onView(team); }}
            style={{ fontWeight: token.fontWeightStrong }}
          >
            {team.name}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: token.fontSizeSM }}>{team.description || '\u2014'}</Typography.Text>
        </div>
      ),
      sortable: true,
      sortValue: (t) => t.name,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (team) => <Typography.Text code>{team.slug}</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'members',
      header: 'Members',
      render: (team) => <Typography.Text>{team.memberCount ?? team.members?.length ?? 0}</Typography.Text>,
      sortable: true,
      sortValue: (t) => t.memberCount ?? t.members?.length ?? 0,
      hideOnMobile: true,
    },
    {
      key: 'projects',
      header: 'Projects',
      render: (team) => (
        <Flex wrap="wrap" gap={token.marginXXS}>
          {(team.projects?.length ?? 0) > 0
            ? (team.projects ?? []).map((p) => <StatusPill key={p} variant="teal">{p}</StatusPill>)
            : <Typography.Text type="secondary">No Project</Typography.Text>}
        </Flex>
      ),
      hideOnMobile: true,
    },
  ];

  const actions: ActionConfig<Team>[] = [
    {
      label: 'View',
      icon: <FaIcon icon="fa-eye" />,
      onClick: (team) => onView(team),
    },
    {
      label: 'Edit',
      icon: <FaIcon icon="fa-pen" />,
      onClick: (team) => onEdit(team),
      show: () => canManage,
    },
    {
      label: 'Delete',
      icon: <FaIcon icon="fa-trash" />,
      onClick: (team) => onDelete(team),
      show: () => canManage,
      variant: 'danger',
    },
  ];

  if (query.isError) {
    return <ErrorState title="Failed to load teams" description="An error occurred while loading teams." onRetry={() => query.refetch()} />;
  }

  return (
    <DataTable
      source={makeSource(query.data)}
      columns={columns}
      rowKey={(t) => t.id}
      isLoading={query.isLoading}
      searchable
      searchPlaceholder="Search teams by name or slug..."
      searchValue={params.search}
      onSearchChange={setSearch}
      filters={[
        { key: 'project', label: 'Project', placeholder: 'All projects', options: projectOptions, onSearch: handleProjectSearch, onScroll: handleProjectScroll, isFetching: projectsQuery.isFetching, hasMore: hasMoreProjects },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No teams found. Create your first team to group members."
      onChange={(p, ps) => setPagination(p, ps)}
      sort={params.sortKey && params.sortDir ? { key: params.sortKey, dir: params.sortDir } : null}
      onSortChange={(s) => setSort(s?.key ?? '', s?.dir ?? '')}
    />
  );
}
