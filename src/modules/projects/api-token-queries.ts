'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApiTokensApi } from './api-tokens';
import { projectKeys } from './keys';
import { useSessionData } from '@/modules/auth/queries';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching API tokens for a project.
 */
export function useApiTokensQuery(projectId: string) {
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';

  return useQuery({
    queryKey: projectKeys.apiTokens(projectId),
    queryFn: () => projectApiTokensApi.list(workspaceId, projectId),
    enabled: !!workspaceId && projectId.length > 0,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for creating a new API token.
 */
export function useCreateApiTokenMutation(projectId: string) {
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; permissions?: string[]; expiresInDays?: number | null }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return projectApiTokensApi.create(workspaceId, projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.apiTokens(projectId) });
    },
  });
}

/**
 * Mutation hook for revoking an API token.
 */
export function useRevokeApiTokenMutation(projectId: string) {
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return projectApiTokensApi.revoke(workspaceId, projectId, tokenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.apiTokens(projectId) });
    },
  });
}
