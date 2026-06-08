'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { memberKeys } from './keys';
import { listMembers, updateMemberRole, removeMember, listInvitations, inviteMember, revokeInvitation } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for fetching all members in a workspace.
 * @param workspaceId - The workspace ID to fetch members for. Skipped if empty.
 */
export function useMembersQuery(workspaceId: string, params?: ListParams) {
  return useQuery({
    queryKey: memberKeys.list(workspaceId, params),
    queryFn: () => listMembers(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for fetching pending invitations in a workspace.
 * @param workspaceId - The workspace ID to fetch invitations for. Skipped if empty.
 */
export function useInvitationsQuery(workspaceId: string, params?: ListParams) {
  return useQuery({
    queryKey: memberKeys.invitations(workspaceId, params),
    queryFn: () => listInvitations(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Mutation hook for updating a member's role.
 * @param workspaceId - The workspace ID
 */
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

/**
 * Mutation hook for removing a member from the workspace.
 * @param workspaceId - The workspace ID
 */
export function useRemoveMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(workspaceId) });
    },
  });
}

/**
 * Mutation hook for sending an invitation.
 * @param workspaceId - The workspace ID
 */
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

/**
 * Mutation hook for revoking an invitation.
 * @param workspaceId - The workspace ID
 */
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
