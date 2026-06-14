'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { memberKeys } from './keys';
import { listMembers, updateMemberRole, removeMember, listInvitations, inviteMember, revokeInvitation, type Member, type Invitation } from './api';
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
 * Mutation hook for updating a member's role with optimistic update.
 * @param workspaceId - The workspace ID
 */
export function useUpdateMemberRoleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  const listPrefix = ['members', 'list', workspaceId] as const;
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateMemberRole(workspaceId, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: listPrefix });
      const previous = queryClient.getQueriesData({ queryKey: listPrefix });
      queryClient.setQueriesData({ queryKey: listPrefix }, (old: { data: Member[]; meta: Record<string, unknown> } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((m) => (m.userId === userId ? { ...m, role } : m)),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listPrefix });
    },
  });
}

/**
 * Mutation hook for removing a member from the workspace with optimistic update.
 * @param workspaceId - The workspace ID
 */
export function useRemoveMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  const listPrefix = ['members', 'list', workspaceId] as const;
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: listPrefix });
      const previous = queryClient.getQueriesData({ queryKey: listPrefix });
      queryClient.setQueriesData({ queryKey: listPrefix }, (old: { data: Member[]; meta: Record<string, unknown> } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((m) => m.userId !== userId),
          meta: { ...old.meta, total: Math.max(0, ((old.meta.total as number) ?? 1) - 1) },
        };
      });
      return { previous };
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listPrefix });
    },
  });
}

/**
 * Mutation hook for sending an invitation with optimistic update.
 * @param workspaceId - The workspace ID
 */
export function useInviteMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  const invitationsPrefix = ['members', 'invitations', workspaceId] as const;
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      inviteMember(workspaceId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: invitationsPrefix });
      const previous = queryClient.getQueriesData({ queryKey: invitationsPrefix });
      const optimistic: Invitation = {
        id: `pending_${Date.now()}`,
        email: data.email,
        role: data.role,
        invitedBy: '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueriesData({ queryKey: invitationsPrefix }, (old: { data: Invitation[]; meta: Record<string, unknown> } | undefined) => {
        if (!old) return { data: [optimistic], meta: { total: 1, page: 1, perPage: 10, lastPage: 1 } };
        return {
          ...old,
          data: [optimistic, ...old.data],
          meta: { ...old.meta, total: ((old.meta.total as number) ?? 0) + 1 },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: invitationsPrefix });
    },
  });
}

/**
 * Mutation hook for revoking an invitation with optimistic update.
 * @param workspaceId - The workspace ID
 */
export function useRevokeInvitationMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  const invitationsPrefix = ['members', 'invitations', workspaceId] as const;
  return useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation(workspaceId, invitationId),
    onMutate: async (invitationId) => {
      await queryClient.cancelQueries({ queryKey: invitationsPrefix });
      const previous = queryClient.getQueriesData({ queryKey: invitationsPrefix });
      queryClient.setQueriesData({ queryKey: invitationsPrefix }, (old: { data: Invitation[]; meta: Record<string, unknown> } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((i) => i.id !== invitationId),
          meta: { ...old.meta, total: Math.max(0, ((old.meta.total as number) ?? 1) - 1) },
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: invitationsPrefix });
    },
  });
}
