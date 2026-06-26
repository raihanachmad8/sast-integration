'use client';

import { useState } from 'react';
import { App, Card, Flex, Tabs, Button, theme } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';

import { ErrorBanner } from '@/commons/components/ErrorBanner';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { TAB_KEY } from '@/commons/constants/layout';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { useMembersQuery, useInvitationsQuery, useRemoveMemberMutation, useRevokeInvitationMutation, useInviteMemberMutation, useUpdateMemberRoleMutation } from '@/modules/members';
import { useSessionData } from '@/modules/auth/queries';
import type { Member } from '@/features/members';
import { ChangeRoleModal, InviteMemberModal, InvitationsTable, MemberSummaryCards, MembersTable } from '@/features/members';

/**
 * Members management page — invite, manage roles, revoke invitations.
 * Part of the MANAGE section in the sidebar.
 *
 * Routes: `/{workspaceSlug}/members`
 */
export default function MembersPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const session = useSessionData();
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
    initialTab === TAB_KEY.PENDING ? TAB_KEY.PENDING : TAB_KEY.MEMBERS,
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
    confirm({
      title: 'Remove member?',
      content: 'This member will lose access to the workspace. This action cannot be undone.',
      okText: 'Remove',
      danger: true,
      onOk: () => {
        removeMemberMutation.mutate(userId, {
          onSuccess: () => message.success('Member removed'),
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  };

  const handleRevokeInvitation = (id: string) => {
    confirm({
      title: 'Revoke invitation?',
      content: 'The invited user will no longer be able to join the workspace using this invitation.',
      okText: 'Revoke',
      danger: true,
      onOk: () => {
        revokeInvitationMutation.mutate(id, {
          onSuccess: () => message.success('Invitation revoked'),
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  };

  const handleTabChange = (key: string) => {
    const tab = key as 'members' | 'pending';
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === TAB_KEY.PENDING) {
      params.set('tab', TAB_KEY.PENDING);
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
    <PermissionGate permission={PERMISSION.MEMBER_VIEW} fallback={<PermissionHint permission={PERMISSION.MEMBER_VIEW} />}>
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Members"
        description="Invite reviewers and manage workspace members."
        actions={
          <PermissionGate permission={PERMISSION.MEMBER_VIEW}>
            <PermissionGate permission={PERMISSION.MEMBER_INVITE}>
              <Button type="primary" icon={<FaIcon icon="fa-user-plus" />} onClick={() => setInviteOpen(true)}>
                Invite member
              </Button>
            </PermissionGate>
          </PermissionGate>
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
    </PermissionGate>
  );
}
