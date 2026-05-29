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
    mutationFn: (data: { name: string; slug?: string; description?: string }) =>
      workspaceApi.create(session.data!.accessToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
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
