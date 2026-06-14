'use client';

import { useMemo } from 'react';
import { Typography, theme } from 'antd';
import { ROLE } from '@/commons/constants/permissions';
import { FaIcon } from '@/components/shared/FaIcon';
import { IdentityCell } from '@/components/shared/IdentityCell';
import { StatusPill } from '@/components/shared/StatusPill';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { getInitials } from '@/lib/utils/getInitials';
import { formatDate } from '@/lib/utils/formatDate';
import { roleLabel } from '@/lib/utils/roleLabel';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useMembersQuery } from '@/modules/members';
import type { Member } from './types';
import { PILL_VARIANT } from './types';

interface MembersTableProps {
  workspaceId: string;
  currentUserId: string | undefined;
  onEdit: (member: Member) => void;
  onRemove: (userId: string) => void;
  tabId?: string;
}

const ROLE_FILTER_OPTIONS = [
  { value: ROLE.OWNER, label: 'Owner' },
  { value: ROLE.MANAGER, label: 'Manager' },
  { value: ROLE.REVIEWER, label: 'Reviewer' },
  { value: ROLE.MEMBER, label: 'Member' },
];

export function MembersTable({
  workspaceId,
  currentUserId,
  onEdit,
  onRemove,
  tabId,
}: MembersTableProps) {
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast(ROLE.MANAGER);
  const canChangeRole = isAtLeast(ROLE.OWNER);
  const { token } = theme.useToken();

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['role'],
    defaultPageSize: 10,
  });

  const query = useMembersQuery(workspaceId, {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    role: params.filters.role || undefined,
  });

  const activeFilters = useMemo(() => {
    const filters = [];
    if (params.filters.role) {
      const roleOption = ROLE_FILTER_OPTIONS.find((r) => r.value === params.filters.role);
      filters.push({ key: 'role', label: 'Role', value: roleOption?.label ?? params.filters.role });
    }
    return filters;
  }, [params.filters.role]);

  const columns: DataTableColumn<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (member) => (
        <IdentityCell
          name={member.name}
          subtitle={member.email}
          avatar={getInitials(member.name, member.email)}
          avatarColor={token.colorText}
        />
      ),
      sortable: true,
      sortValue: (m) => m.name,
    },
    {
      key: 'role',
      header: 'Role',
      render: (member) => (
        <StatusPill variant={PILL_VARIANT[member.role] ?? 'slate'}>
          {roleLabel(member.role)}
        </StatusPill>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusPill variant="teal">Active</StatusPill>,
      hideOnMobile: true,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (member) => (
        <Typography.Text type="secondary">{formatDate(member.joinedAt)}</Typography.Text>
      ),
      sortable: true,
      sortValue: (m) => m.joinedAt ?? '',
      hideOnMobile: true,
    },
  ];

  const actions: ActionConfig<Member>[] = useMemo(() => {
    if (!canManage) return [];

    const list: ActionConfig<Member>[] = [];
    if (canChangeRole) {
      list.push({
        label: 'Edit role',
        icon: <FaIcon icon="fa-pen" />,
        show: (member) => member.userId !== currentUserId && member.role !== ROLE.OWNER,
        onClick: (member) => onEdit(member),
      });
    }
    list.push({
      label: 'Remove',
      icon: <FaIcon icon="fa-user-slash" />,
      variant: 'danger',
      show: (member) => member.userId !== currentUserId && member.role !== ROLE.OWNER,
      onClick: (member) => onRemove(member.userId),
    });
    return list;
  }, [canManage, canChangeRole, currentUserId, onEdit, onRemove]);

  return (
    <div
      role="tabpanel"
      id={tabId ? `${tabId}-members-panel` : undefined}
      aria-labelledby={tabId ? `${tabId}-members` : undefined}
    >
      <DataTable
        source={makeSource(query.data)}
        columns={columns}
        rowKey={(m) => m.userId}
        isLoading={query.isLoading}
        searchable
        searchPlaceholder="Search members by name or email..."
        searchValue={params.search}
        onSearchChange={setSearch}
        filters={[
          {
            key: 'role',
            label: 'Role',
            placeholder: 'All roles',
            options: ROLE_FILTER_OPTIONS,
          },
        ]}
        filterValues={params.filters}
        onFilterChange={setFilter}
        activeFilters={activeFilters}
        onFilterRemove={(key) => setFilter(key, '')}
        actions={actions.length > 0 ? actions : undefined}
        emptyText="No members found. Try a different search term or role filter."
        onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
      />
    </div>
  );
}
