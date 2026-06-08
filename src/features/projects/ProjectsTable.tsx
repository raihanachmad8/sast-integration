'use client';

import { useMemo } from 'react';
import { Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorState } from '@/components/shared/ErrorState';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useProjectsQuery } from '@/modules/projects';
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
    per_page: params.per_page,
    search: params.search || undefined,
    repository: params.filters.repository || undefined,
    team: params.filters.team || undefined,
    member: params.filters.member || undefined,
  });

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
      render: (project) => <Chips items={project.teams} variant="slate" max={3} />,
      hideOnMobile: true,
    },
    {
      key: 'members',
      header: 'Members',
      render: (project) => <Chips items={project.members} variant="slate" max={3} />,
      hideOnMobile: true,
    },
    {
      key: 'automation',
      header: 'Automation',
      render: (project) => (
        project.automation.length > 0
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
    return <ErrorState title="Failed to load projects" description="An error occurred while loading projects." />;
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
        { key: 'repository', label: 'Repository', placeholder: 'All repositories', options: [], searchable: true },
        { key: 'team', label: 'Team', placeholder: 'All teams', options: [], searchable: true },
        { key: 'member', label: 'Member', placeholder: 'All members', options: [], searchable: true },
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

function Chips({ items, variant, max }: { items: string[]; variant: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'; max: number }) {
  const { token } = theme.useToken();
  if (items.length === 0) return <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>—</Typography.Text>;
  return (
    <Flex wrap="wrap" gap={4}>
      {items.slice(0, max).map((item) => <StatusPill key={item} variant={variant}>{item}</StatusPill>)}
      {items.length > max && <StatusPill variant="blue">+{items.length - max}</StatusPill>}
    </Flex>
  );
}
