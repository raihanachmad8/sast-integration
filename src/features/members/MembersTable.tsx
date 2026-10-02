'use client';

import { useState } from 'react';
import { Button, Input, Select, Popconfirm, Flex, Row, Col, Tag, Typography, theme } from 'antd';
import { ROLE } from '@/commons/constants/permissions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { FaIcon } from '@/components/shared/fa-icon';
import { TableFooter } from '@/components/shared/TableFooter';
import { IdentityCell } from '@/components/shared/IdentityCell';
import { StatusPill } from '@/components/shared/StatusPill';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { getInitials } from '@/lib/utils/getInitials';
import { formatDate } from '@/lib/utils/formatDate';
import { roleLabel } from '@/lib/utils/roleLabel';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { Member } from './types';
import { PILL_VARIANT } from './types';

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
  currentUserId: string | undefined;
  onEdit: (member: Member) => void;
  onRemove: (userId: string) => void;
  /** Tab ID prefix for ARIA linkage (matches TabBar id prop) */
  tabId?: string;
}

export function MembersTable({ members, isLoading, currentUserId, onEdit, onRemove, tabId }: MembersTableProps) {
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast(ROLE.MANAGER);
  const canChangeRole = isAtLeast(ROLE.OWNER);
  const { token } = theme.useToken();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);

  const filtered = members.filter(m => {
    const q = debouncedSearch.trim().toLowerCase();
    const matchesQuery = !q || `${m.name} ${m.email}`.toLowerCase().includes(q);
    const matchesRole = !roleFilter || m.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (member) => <IdentityCell name={member.name} subtitle={member.email} avatar={getInitials(member.name, member.email)} avatarColor={token.colorText} />,
      sortable: true,
      sortValue: (m) => m.name,
    },
    {
      key: 'role',
      header: 'Role',
      render: (member) => <StatusPill variant={PILL_VARIANT[member.role] ?? 'slate'}>{roleLabel(member.role)}</StatusPill>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusPill variant="teal">Active</StatusPill>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (member) => <Typography.Text type="secondary">{formatDate(member.joinedAt)}</Typography.Text>,
      sortable: true,
      sortValue: (m) => m.joinedAt ?? '',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (member) => {
        const isSelf = member.userId === currentUserId;
        const isRecordOwner = member.role === ROLE.OWNER;
        return (
          <Flex justify="flex-end" gap={token.paddingMD}>
            {canManage && !isSelf && !isRecordOwner ? (<>
              {canChangeRole && <Button size="small" onClick={() => onEdit(member)}><FaIcon icon="fa-pen" /> Edit</Button>}
              <Popconfirm title="Remove this member?" onConfirm={() => onRemove(member.userId)} okText="OK" cancelText="Cancel">
                <Button size="small" danger><FaIcon icon="fa-user-slash" /> Remove</Button>
              </Popconfirm>
            </>) : <Tag style={{ margin: 0 }}>{isSelf ? 'You' : 'Locked'}</Tag>}
          </Flex>
        );
      },
    },
  ];

  return (
    <div role="tabpanel" id={tabId ? `${tabId}-members-panel` : undefined} aria-labelledby={tabId ? `${tabId}-members` : undefined}>
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
        <Row gutter={[token.marginSM, token.marginSM]}>
          <Col xs={24} sm={12} md={8}>
            <Input allowClear style={{ width: '100%' }} placeholder="Search members" prefix={<FaIcon icon="fa-magnifying-glass" />} value={search} onChange={e => setSearch(e.target.value)} />
          </Col>
          <Col xs={12} sm={12} md={5}>
            <Select style={{ width: '100%' }} value={roleFilter} onChange={setRoleFilter} options={[{ value: '', label: 'All roles' }, { value: ROLE.OWNER, label: 'Owner' }, { value: ROLE.MANAGER, label: 'Manager' }, { value: ROLE.REVIEWER, label: 'Reviewer' }, { value: ROLE.MEMBER, label: 'Member' }]} />
          </Col>
        </Row>
      </div>
      {isLoading ? (
        <LoadingState text="Loading members..." />
      ) : filtered.length ? (
        <>
          <DataTable
            data={paginated}
            columns={columns}
            rowKey={(m) => m.userId}
          />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : <EmptyState icon="fa-user-magnifying-glass" title="No members found" text="Try a different search term or role filter." />}
    </div>
  );
}
