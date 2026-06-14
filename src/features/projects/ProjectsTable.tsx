'use client';

import { useMemo } from 'react';
import { Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorState } from '@/components/shared/ErrorState';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useProjectsQuery } from '@/modules/projects';
import { useRepositoriesQuery } from '@/modules/repositories';
import { useTeamsQuery } from '@/modules/teams';
import { useMembersQuery } from '@/modules/members';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Project } from '@/commons/types';

interface ProjectsTableProps {
  onView: (project: Project) => void;
}

export function ProjectsTable({ onView }: ProjectsTableProps) {
  const { token } = theme.useToken();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
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
  });

  const { workspaceId } = useWorkspace();
  const reposQuery = useRepositoriesQuery({ page: 1, perPage: 200 });
  const teamsQuery = useTeamsQuery({ page: 1, perPage: 200 });
  const membersQuery = useMembersQuery(workspaceId ?? '', { page: 1, perPage: 200 });

  const repoOptions = (reposQuery.data?.data ?? []).map((r) => ({ value: r.name, label: r.name }));
  const teamOptions = (teamsQuery.data?.data ?? []).map((t) => ({ value: t.name, label: t.name }));
  const memberOptions = (membersQuery.data?.data ?? []).map((m) => ({ value: m.email, label: `${m.name} (${m.email})` }));

  const activeFilters = useMemo(() => {
    const filters = [];
    if (params.filters.repository) {
      filters.push({ key: 'repository', label: 'Repository', value: params.filters.repository });
    }
    if (params.filters.team) {
      filters.push({ key: 'team', label: 'Team', value: params.filters.team });
    }
    if (params.filters.member) {
      filters.push({ key: 'member', label: 'Member', value: params.filters.member });
    }
    return filters;
  }, [params.filters.repository, params.filters.team, params.filters.member]);

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      render: (project) => (
        <div>
          <Typography.Link
            onClick={(e) => { e.stopPropagation(); onView(project); }}
            style={{ fontWeight: 600 }}
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
      render: (project) => <Chips items={project.repositories} variant="slate" max={3} />,
      hideOnMobile: true,
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (project) => <Chips items={project.teamNames} count={project.teams?.length} variant="slate" max={3} />,
      hideOnMobile: true,
    },
    {
      key: 'members',
      header: 'Members',
      render: (project) => <Chips items={project.memberNames} count={project.members?.length} variant="slate" max={3} />,
      hideOnMobile: true,
    },
    {
      key: 'automation',
      header: 'Automation',
      render: (project) => (
        (project.automation?.length ?? 0) > 0
          ? <Chips items={project.automation} variant="teal" max={3} />
          : <Typography.Text style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>Manual</Typography.Text>
      ),
      hideOnMobile: true,
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
        { key: 'repository', label: 'Repository', placeholder: 'All repositories', options: repoOptions, searchable: true },
        { key: 'team', label: 'Team', placeholder: 'All teams', options: teamOptions, searchable: true },
        { key: 'member', label: 'Member', placeholder: 'All members', options: memberOptions, searchable: true },
      ]}
      filterValues={params.filters}
      onFilterChange={setFilter}
      activeFilters={activeFilters}
      onFilterRemove={(key) => setFilter(key, '')}
      actions={actions}
      emptyText="No projects found. Create your first project to organize repositories."
      onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
    />
  );
}

function Chips({ items, count, variant, max }: { items?: string[]; count?: number; variant: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'; max: number }) {
  const { token } = theme.useToken();
  if (!items || items.length === 0) {
    if (count && count > 0) return <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>{count} item{count !== 1 ? 's' : ''}</Typography.Text>;
    return <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>—</Typography.Text>;
  }
  return (
    <Flex wrap="wrap" gap={token.marginXXS}>
      {items.slice(0, max).map((item) => <StatusPill key={item} variant={variant}>{item}</StatusPill>)}
      {items.length > max && <StatusPill variant="blue">+{items.length - max}</StatusPill>}
    </Flex>
  );
}
