'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from './api';
import { workspaceKeys } from './keys';
import { authKeys } from '@/modules/auth/keys';
import { useSessionQuery } from '@/modules/auth/queries';

export function useWorkspacesQuery() {
  const session = useSessionQuery();
  const token = session.data?.accessToken;

  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspaceApi.list(token!),
    enabled: !!token,
  });
}

export function useCreateWorkspaceMutation() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; slug?: string; description?: string; type?: 'personal' | 'organization' }) => {
      if (!session.data?.accessToken) throw new Error('Session expired. Sign in again.');
      return workspaceApi.create(session.data.accessToken, data);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(authKeys.session(), (current: { user: { currentWorkspaceId: string | null }, workspace: unknown } | undefined) => {
        if (!current) return current;
        return {
          ...current,
          user: { ...current.user, currentWorkspaceId: workspace.id },
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            role: workspace.role ?? 'owner',
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

export function useSwitchWorkspaceMutation() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceApi.switchWorkspace(session.data!.accessToken, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
