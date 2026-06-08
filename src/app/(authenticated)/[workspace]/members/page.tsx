'use client';

import { useState } from 'react';
import { App, Card, Flex, Tabs, Button, theme } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { MemberSummaryCards, MembersTable, InvitationsTable, InviteMemberModal, ChangeRoleModal } from '@/features/members';
import { useSessionQuery } from '@/modules/auth/queries';
import { useMembersQuery, useInvitationsQuery, useRemoveMemberMutation, useRevokeInvitationMutation, useInviteMemberMutation, useUpdateMemberRoleMutation } from '@/modules/members';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { errorMessage } from '@/lib/api/errors';
import { FaIcon } from '@/components/shared/FaIcon';
import type { Member } from '@/features/members';

/**
 * Members management page — invite, manage roles, revoke invitations.
 * Part of the MANAGE section in the sidebar.
 *
 * Routes: `/{workspaceSlug}/members`
 */
export default function MembersPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';
  const membersQuery = useMembersQuery(workspaceId);
  const invitationsQuery = useInvitationsQuery(workspaceId);
  const removeMemberMutation = useRemoveMemberMutation(workspaceId);
  const revokeInvitationMutation = useRevokeInvitationMutation(workspaceId);
  const inviteMutation = useInviteMemberMutation(workspaceId);
  const updateRoleMutation = useUpdateMemberRoleMutation(workspaceId);

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'members' | 'pending'>(
    initialTab === 'pending' ? 'pending' : 'members',
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const memberCount = membersQuery.data?.meta?.total ?? 0;
  const invitations = invitationsQuery.data?.data ?? [];
  const currentUserId = session.data?.user.id;

  if (membersQuery.isLoading || invitationsQuery.isLoading) {
    return <LoadingState text="Loading members..." />;
  }

  if (membersQuery.error) {
    return <ErrorBanner message={errorMessage(membersQuery.error)} />;
  }

  const handleInvite = (values: { email: string; role: string }) => {
    inviteMutation.mutate(values, {
      onSuccess: () => {
        message.success(`Invitation sent to ${values.email}`);
        setInviteOpen(false);
      },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleChangeRole = (role: string) => {
    if (!editingMember) return;
    updateRoleMutation.mutate(
      { userId: editingMember.userId, role },
      {
        onSuccess: () => {
          message.success(`Role updated for ${editingMember.email}`);
          setEditingMember(null);
        },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId, {
      onSuccess: () => message.success('Member removed'),
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleRevokeInvitation = (id: string) => {
    revokeInvitationMutation.mutate(id, {
      onSuccess: () => message.success('Invitation revoked'),
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleTabChange = (key: string) => {
    const tab = key as 'members' | 'pending';
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'pending') {
      params.set('tab', 'pending');
    } else {
      params.delete('tab');
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  const tabItems = [
    {
      key: 'members',
      label: `Members (${memberCount})`,
      children: (
        <MembersTable
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          onEdit={(member) => setEditingMember(member)}
          onRemove={handleRemoveMember}
          tabId="members"
        />
      ),
    },
    {
      key: 'pending',
      label: `Pending (${invitations.length})`,
      children: (
        <InvitationsTable
          workspaceId={workspaceId}
          onRevoke={handleRevokeInvitation}
          tabId="members"
        />
      ),
    },
  ];

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Members"
        description="Invite reviewers and manage workspace members."
        actions={
          <Button type="primary" icon={<FaIcon icon="fa-user-plus" />} onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        }
      />

      <MemberSummaryCards memberCount={memberCount} invitationCount={invitations.length} />

      <Card styles={{ body: { padding: 0 } }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} tabBarStyle={{ padding: `0 ${token.paddingLG}px` }} />
      </Card>

      <InviteMemberModal
        open={inviteOpen}
        onConfirm={handleInvite}
        onCancel={() => setInviteOpen(false)}
        isLoading={inviteMutation.isPending}
        error={inviteMutation.error}
      />

      <ChangeRoleModal
        open={!!editingMember}
        email={editingMember?.email}
        newRole={editingMember?.role ?? 'member'}
        onConfirm={handleChangeRole}
        onCancel={() => setEditingMember(null)}
        isLoading={updateRoleMutation.isPending}
      />
    </Flex>
  );
}
