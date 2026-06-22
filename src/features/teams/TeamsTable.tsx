'use client';

import { useMemo } from 'react';
import { Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { StatusPill } from '@/commons/components/StatusPill';
import { ErrorState } from '@/commons/components/ErrorState';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useTeamsQuery } from '@/modules/teams';
import { useProjectsQuery } from '@/modules/projects/queries';
import type { Team } from '@/commons/types';

interface TeamsTableProps {
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
}

export function TeamsTable({ onView, onEdit }: TeamsTableProps) {
  const { token } = theme.useToken();

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['project'],
    defaultPageSize: 10,
  });

  const query = useTeamsQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    project: params.filters.project || undefined,
  });

  const projectsQuery = useProjectsQuery({ page: 1, perPage: 200 });
  const projectOptions = (projectsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }));

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
            style={{ fontWeight: 600 }}
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
      render: (team) => <Typography.Text>{team.memberCount}</Typography.Text>,
      sortable: true,
      sortValue: (t) => t.memberCount,
      hideOnMobile: true,
    },
    {
      key: 'projects',
      header: 'Projects',
      render: (team) => (
        <Flex wrap="wrap" gap={token.marginXXS}>
          {team.projects.length > 0
            ? team.projects.map((p) => <StatusPill key={p} variant="teal">{p}</StatusPill>)
            : <Typography.Text style={{ color: token.colorTextSecondary }}>{'\u2014'}</Typography.Text>}
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
        { key: 'project', label: 'Project', placeholder: 'All projects', options: projectOptions, searchable: true },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No teams found. Create your first team to group members."
      onChange={(p, ps) => setPagination(p, ps)}
    />
  );
}
