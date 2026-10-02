'use client';

import { useState } from 'react';
import { Button, Flex, Input, Popconfirm, Tag, Typography, theme } from 'antd';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { FaIcon } from '@/components/shared/fa-icon';
import { TableFooter } from '@/components/shared/TableFooter';
import { IdentityCell } from '@/components/shared/IdentityCell';
import { StatusPill } from '@/components/shared/StatusPill';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils/formatDate';
import { roleLabel } from '@/lib/utils/roleLabel';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { Invitation } from './types';
import { PILL_VARIANT } from './types';

/** Props for the InvitationsTable component. */
interface InvitationsTableProps {
  /** Array of invitation objects to display. */
  invitations: Invitation[];
  /** Whether the invitations data is currently loading. */
  isLoading: boolean;
  /** Callback triggered when the user confirms revoking an invitation. */
  onRevoke: (invitationId: string) => void;
  /** Tab ID prefix for ARIA linkage (matches TabBar id prop) */
  tabId?: string;
}

/**
 * Renders a searchable, paginated table of pending workspace invitations.
 *
 * @param props - The invitations table configuration.
 * @returns A table component with search and pagination controls.
 *
 * @example
 * <InvitationsTable
 *   invitations={invitationRows}
 *   isLoading={false}
 *   onRevoke={(id) => revokeInvitation(id)}
 * />
 */
export function InvitationsTable({ invitations, isLoading, onRevoke, tabId }: InvitationsTableProps) {
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast('manager');
  const { token } = theme.useToken();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search);

  const filtered = invitations.filter(i => {
    const q = debouncedSearch.trim().toLowerCase();
    return !q || `${i.email} ${i.role}`.toLowerCase().includes(q);
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (invite) => <IdentityCell name={invite.email} subtitle="Invitation email" avatar={<FaIcon icon="fa-envelope" />} avatarColor={token.colorPrimary} />,
      sortable: true,
      sortValue: (i) => i.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (invite) => <StatusPill variant={PILL_VARIANT[invite.role] ?? 'slate'}>{roleLabel(invite.role)}</StatusPill>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusPill variant="amber">Pending</StatusPill>,
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (invite) => <Typography.Text type="secondary">{formatDate(invite.createdAt)}</Typography.Text>,
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (invite) => <Typography.Text type="secondary">{formatDate(invite.expiresAt)}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (invite) => (
        <Flex justify="flex-end" gap={token.marginMD}>
          {canManage ? (
              <Popconfirm title="Revoke this invitation?" onConfirm={() => onRevoke(invite.id)} okText="OK" cancelText="Cancel">
                <Button size="small" danger><FaIcon icon="fa-xmark" /> Revoke</Button>
              </Popconfirm>
          ) : <Tag style={{ margin: 0 }}>View only</Tag>}
        </Flex>
      ),
    },
  ];

  return (
    <div role="tabpanel" id={tabId ? `${tabId}-pending-panel` : undefined} aria-labelledby={tabId ? `${tabId}-pending` : undefined}>
      <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
        <Input allowClear style={{ width: '100%' }} placeholder="Search pending invitations" prefix={<FaIcon icon="fa-magnifying-glass" />} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <LoadingState text="Loading invitations..." />
      ) : filtered.length ? (
        <>
          <DataTable
            data={paginated}
            columns={columns}
            rowKey={(i) => i.id}
          />
          <TableFooter current={page} pageSize={pageSize} total={filtered.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
        </>
      ) : <EmptyState icon="fa-envelope-circle-check" title="No pending invitations" text="Invitations waiting for acceptance will appear here." />}
    </div>
  );
}
