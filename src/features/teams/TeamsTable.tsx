'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Card, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { TableFooter } from '@/components/shared/TableFooter';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { Team } from '@/commons/types';

interface TeamsTableProps {
  rows: Team[];
  isLoading?: boolean;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
}

export function TeamsTable({ rows, isLoading = false, onView, onEdit }: TeamsTableProps) {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  }, [rows, debouncedSearch]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      render: (team) => (
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>{team.name}</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{team.description || '\u2014'}</div>
        </div>
      ),
      sortable: true,
      sortValue: (t) => t.name,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (team) => (
        <Typography.Text style={{ fontFamily: 'monospace', fontSize: token.fontSize, color: token.colorTextSecondary }}>{team.slug}</Typography.Text>
      ),
    },
    {
      key: 'members',
      header: 'Members',
      render: (team) => <Typography.Text style={{ color: token.colorTextSecondary }}>{team.memberCount}</Typography.Text>,
      sortable: true,
      sortValue: (t) => t.memberCount,
    },
    {
      key: 'projects',
      header: 'Projects',
      render: (team) => (
        <Flex wrap="wrap" gap={4}>
          {team.projects.length > 0
            ? team.projects.map((p) => <StatusPill key={p} variant="teal">{p}</StatusPill>)
            : <Typography.Text style={{ color: token.colorTextSecondary }}>{'\u2014'}</Typography.Text>}
        </Flex>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (team) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={() => onView(team)}>
            <FaIcon icon="fa-eye" /> View
          </Button>
          <Button size="small" onClick={() => onEdit(team)}>
            <FaIcon icon="fa-pen" /> Edit
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: token.paddingSM }}>
        <Input
          allowClear
          style={{ width: '100%', maxWidth: 360 }}
          placeholder="Search teams"
          prefix={<FaIcon icon="fa-magnifying-glass" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <LoadingState text="Loading teams..." />
      ) : paged.length > 0 ? (
        <>
          <DataTable
            data={paged}
            columns={columns}
            rowKey={(t) => t.id}
          />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : (
        <EmptyState icon="fa-people-group" title="No teams found" text="Create your first team to group members." />
      )}
    </Card>
  );
}
