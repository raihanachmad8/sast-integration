'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from './api';
import { workspaceKeys } from './keys';
import { authKeys } from '@/modules/auth/keys';
import { STALE } from '@/commons/constants/query';
import { setWorkspaceId } from '@/lib/api/client';
import { useSessionQuery } from '@/modules/auth/queries';
import type { WorkspaceItem } from './types';

export function useWorkspacesQuery() {
  const session = useSessionQuery();

  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const { data } = await workspaceApi.list();
      return data;
    },
    enabled: !!session.data?.accessToken,
    staleTime: STALE.DEFAULT,
  });
}

export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; slug?: string; description?: string; type?: 'personal' | 'organization' }) =>
      workspaceApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function useSwitchWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceApi.switchWorkspace(workspaceId).then((res) => res.data),
    onSuccess: (_data, variables) => {
      setWorkspaceId(variables);
      // Find slug from cached workspace list for localStorage cache
      const workspaces = queryClient.getQueryData<WorkspaceItem[]>(workspaceKeys.list());
      const ws = workspaces?.find((w) => w.id === variables);
      if (ws?.slug) {
        setWorkspaceId(variables, ws.slug);
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

/**
 * Query hook for fetching workspace detail by ID.
 * @param workspaceId - The workspace ID to fetch. Skipped if empty.
 */
export function useWorkspaceDetailQuery(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceApi.getDetail(workspaceId),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Query hook for fetching pending invitations for the current user.
 */
export function usePendingInvitationsQuery() {
  const session = useSessionQuery();

  return useQuery({
    queryKey: workspaceKeys.pendingInvitations(),
    queryFn: async () => {
      const { data } = await workspaceApi.listPendingInvitations();
      return data;
    },
    enabled: !!session.data?.accessToken,
    staleTime: STALE.SHORT,
  });
}

/**
 * Mutation hook for accepting a pending invitation.
 */
export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      workspaceApi.acceptInvitation(invitationId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/**
 * Mutation hook for declining a pending invitation.
 */
export function useDeclineInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      workspaceApi.declineInvitation(invitationId),
    onMutate: async (invitationId) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.pendingInvitations() });
      const previous = queryClient.getQueryData(workspaceKeys.pendingInvitations());
      queryClient.setQueryData(workspaceKeys.pendingInvitations(), (old: Array<{ id: string }> | undefined) => {
        if (!old) return old;
        return old.filter((inv) => inv.id !== invitationId);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(workspaceKeys.pendingInvitations(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.pendingInvitations() });
    },
  });
}

/**
 * Mutation hook for updating workspace settings (name, slug, description).
 * Invalidates both the list and detail queries on success.
 */
export function useUpdateWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; slug?: string; description?: string } }) =>
      workspaceApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}
