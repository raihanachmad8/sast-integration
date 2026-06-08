'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from './api';
import { workspaceKeys } from './keys';
import { useSessionQuery } from '@/modules/auth/queries';
import { authKeys } from '@/modules/auth/keys';
import { STALE } from '@/commons/constants/query';

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
    onSuccess: () => {
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
    },
  });
}
