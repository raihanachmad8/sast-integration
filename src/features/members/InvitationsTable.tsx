'use client';

import { useMemo } from 'react';
import { Typography, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { IdentityCell } from '@/commons/components/IdentityCell';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { formatDate } from '@/lib/utils/formatDate';
import { roleLabel } from '@/lib/utils/roleLabel';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useInvitationsQuery } from '@/modules/members';
import type { Invitation } from './types';
import { PILL_VARIANT } from './types';

interface InvitationsTableProps {
  workspaceId: string;
  onRevoke: (invitationId: string) => void;
  tabId?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
];

/**
 * Paginated data table for listing workspace invitations with status filter and revoke action.
 *
 * Uses the shared DataTable with server-side pagination and permission-gated revoke.
 *
 * @param props - {@link InvitationsTableProps}
 * @returns JSX element rendering the invitations data table.
 *
 * @example
 * <InvitationsTable
 *   workspaceId="ws_123"
 *   onRevoke={(id) => revokeInvitation(id)}
 *   tabId="invitations"
 * />
 */
export function InvitationsTable({ workspaceId, onRevoke, tabId }: InvitationsTableProps) {
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast('manager');
  const { token } = theme.useToken();

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['status'],
    defaultPageSize: 10,
  });

  const query = useInvitationsQuery(workspaceId, {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
  });

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (invite) => (
        <IdentityCell
          name={invite.email}
          subtitle="Invitation email"
          avatar={<FaIcon icon="fa-envelope" />}
          avatarColor={token.colorPrimary}
        />
      ),
      sortable: true,
      sortValue: (i) => i.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (invite) => (
        <StatusPill variant={PILL_VARIANT[invite.role] ?? 'slate'}>
          {roleLabel(invite.role)}
        </StatusPill>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invite) => {
        const isExpired = new Date(invite.expiresAt) < new Date();
        return <StatusPill variant={isExpired ? 'red' : 'amber'}>{isExpired ? 'Expired' : 'Pending'}</StatusPill>;
      },
      hideOnMobile: true,
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (invite) => <Typography.Text type="secondary">{formatDate(invite.createdAt)}</Typography.Text>,
      hideOnMobile: true,
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (invite) => <Typography.Text type="secondary">{formatDate(invite.expiresAt)}</Typography.Text>,
      hideOnMobile: true,
    },
  ];

  const actions: ActionConfig<Invitation>[] = useMemo(() => {
    if (!canManage) return [];

    return [
      {
        label: 'Revoke',
        icon: <FaIcon icon="fa-xmark" />,
        variant: 'danger',
        onClick: (invite) => onRevoke(invite.id),
      },
    ];
  }, [canManage, onRevoke]);

  const activeFilters = useMemo(() => {
    if (!params.filters.status) return [];
    const option = STATUS_FILTER_OPTIONS.find((s) => s.value === params.filters.status);
    return [{ key: 'status', label: 'Status', value: option?.label ?? params.filters.status }];
  }, [params.filters.status]);

  return (
    <div role="tabpanel" id={tabId ? `${tabId}-pending-panel` : undefined} aria-labelledby={tabId ? `${tabId}-pending` : undefined}>
      <DataTable
        source={makeSource(query.data)}
        columns={columns}
        rowKey={(i) => i.id}
        isLoading={query.isLoading}
        searchable
        searchPlaceholder="Search invitations by email..."
        searchValue={params.search}
        onSearchChange={setSearch}
        filters={[
          {
            key: 'status',
            label: 'Status',
            placeholder: 'All statuses',
            options: STATUS_FILTER_OPTIONS,
          },
        ]}
        filterValues={params.filters}
        onFilterChange={setFilter}
        activeFilters={activeFilters}
        onFilterRemove={(key) => setFilter(key, '')}
        actions={actions.length > 0 ? actions : undefined}
        emptyText="No pending invitations. Invitations waiting for acceptance will appear here."
        onChange={(p, ps) => setPagination(p, ps)}
      />
    </div>
  );
}
