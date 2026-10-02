'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memberKeys } from './keys';
import { listMembers, updateMemberRole, removeMember, listInvitations, inviteMember, revokeInvitation } from './api';
import type { Member, Invitation } from './api';

export function useMembersQuery(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.list(workspaceId),
    queryFn: () => listMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useInvitationsQuery(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.invitations(workspaceId),
    queryFn: () => listInvitations(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRoleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
    },
  });
}

export function useRemoveMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
    },
  });
}

export function useInviteMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      inviteMember(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
    },
  });
}

export function useRevokeInvitationMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.invitations(workspaceId) });
    },
  });
}
