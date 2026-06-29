'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { apiTokensApi } from './api';
import { apiTokenKeys } from './keys';

/**
 * Query hook for fetching API tokens for a project.
 */
export function useApiTokensQuery(projectId: string) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: apiTokenKeys.list(workspaceId!, projectId),
    queryFn: () => apiTokensApi.list(workspaceId!, projectId),
    enabled: !!workspaceId && projectId.length > 0,
    staleTime: STALE.FILTERED,
  });
}

/**
 * Mutation hook for creating a new API token.
 */
export function useCreateApiTokenMutation(projectId: string) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; permissions?: string[]; expiresInDays?: number | null }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return apiTokensApi.create(workspaceId, projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.list(workspaceId!, projectId) });
    },
  });
}

/**
 * Mutation hook for revoking an API token.
 */
export function useRevokeApiTokenMutation(projectId: string) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return apiTokensApi.revoke(workspaceId, projectId, tokenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.list(workspaceId!, projectId) });
    },
  });
}
