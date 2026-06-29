'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import type { InvitationListQuery } from '@/commons/schemas/member.schema';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { invitationsApi, type Invitation } from './api';
import { invitationKeys } from './keys';

/** Query hook for fetching pending invitations in a workspace. */
export function useInvitationsQuery(params?: Partial<Omit<InvitationListQuery, 'workspace_id'>>, enabled?: boolean) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: invitationKeys.list(workspaceId!, params),
    queryFn: () => invitationsApi.list(workspaceId!, params),
    enabled: enabled !== undefined ? enabled && !!workspaceId : !!workspaceId,
    staleTime: STALE.FILTER,
    placeholderData: keepPreviousData,
  });
}

/** Mutation hook for sending an invitation with optimistic update. */
export function useInviteMemberMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      invitationsApi.invite(workspaceId!, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: invitationKeys.all });
      const previous = queryClient.getQueriesData({ queryKey: invitationKeys.all });
      const optimistic: Invitation = {
        id: `pending_${Date.now()}`,
        email: data.email,
        role: data.role,
        invitedBy: '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueriesData({ queryKey: invitationKeys.all }, (old: { data: Invitation[]; meta: Record<string, unknown> } | undefined) => {
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
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

/** Mutation hook for revoking an invitation with optimistic update. */
export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (invitationId: string) =>
      invitationsApi.revoke(workspaceId!, invitationId),
    onMutate: async (invitationId) => {
      await queryClient.cancelQueries({ queryKey: invitationKeys.all });
      const previous = queryClient.getQueriesData({ queryKey: invitationKeys.all });
      queryClient.setQueriesData({ queryKey: invitationKeys.all }, (old: { data: Invitation[]; meta: Record<string, unknown> } | undefined) => {
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
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}
