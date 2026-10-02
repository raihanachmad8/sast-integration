'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Card, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { TableFooter } from '@/components/shared/TableFooter';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { Project } from '@/commons/types';

interface ProjectsTableProps {
  rows: Project[];
  isLoading?: boolean;
  error?: string | null;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export function ProjectsTable({ rows, isLoading = false, error = null, onView, onEdit }: ProjectsTableProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [rows, debouncedSearch]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      render: (project) => (
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>{project.name}</div>
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
      render: (project) => <Chips items={project.repositories} variant="slate" max={3} token={token} />,
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (project) => <Chips items={project.teams} variant="slate" max={3} token={token} />,
    },
    {
      key: 'members',
      header: 'Members',
      render: (project) => <Chips items={project.members} variant="slate" max={3} token={token} />,
    },
    {
      key: 'automation',
      header: 'Automation',
      render: (project) => (
        project.automation.length > 0
          ? <Chips items={project.automation} variant="teal" max={3} token={token} />
          : <Typography.Text style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>Manual</Typography.Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (project) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={() => onView(project)}>
            <FaIcon icon="fa-eye" /> View
          </Button>
          <Button size="small" onClick={() => onEdit(project)}>
            <FaIcon icon="fa-pen" /> Edit
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
        <Input
          allowClear
          style={{ width: '100%', maxWidth: 360 }}
          placeholder="Search projects"
          prefix={<FaIcon icon="fa-magnifying-glass" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <LoadingState text="Loading projects..." />
      ) : error ? (
        <ErrorState title="Failed to load projects" description={error} />
      ) : paged.length > 0 ? (
        <>
          <DataTable
            data={paged}
            columns={columns}
            rowKey={(p) => p.id}
          />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : (
        <EmptyState icon="fa-diagram-project" title="No projects found" text="Create your first project to organize repositories." />
      )}
    </Card>
  );
}

function Chips({ items, variant, max }: { items: string[]; variant: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'; max: number }) {
  if (items.length === 0) return <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>—</Typography.Text>;
  return (
    <Flex wrap="wrap" gap={4}>
      {items.slice(0, max).map((item) => <StatusPill key={item} variant={variant}>{item}</StatusPill>)}
      {items.length > max && <StatusPill variant="blue">+{items.length - max}</StatusPill>}
    </Flex>
  );
}
