'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { sourceControlApi } from './api';
import { sourceControlKeys } from './keys';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { UpdateSourceControlInput } from '@/commons/schemas/source-control.schema';

/**
 * Query hook for fetching all SCM provider connections.
 */
export function useSourceControlProvidersQuery() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: sourceControlKeys.providers(),
    queryFn: () => sourceControlApi.listProviders(workspaceId!),
    staleTime: STALE.DEFAULT,
    enabled: !!workspaceId,
  });
}

/**
 * Query hook for fetching repositories from a specific SCM provider.
 * @param providerId - The provider ID. Skipped if empty.
 */
export function useSourceControlReposQuery(providerId: string, params?: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: sourceControlKeys.repos(providerId, params),
    queryFn: () => sourceControlApi.listRepos(workspaceId!, providerId, params),
    enabled: !!providerId && !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Mutation hook for adding a new SCM provider connection.
 */
export function useAddSourceControlProviderMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (payload: { name: string; type: string; token: string; org: string }) =>
      sourceControlApi.addProvider(workspaceId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}

/**
 * Mutation hook for syncing repositories from an SCM provider.
 */
export function useSyncSourceControlReposMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (payload: { providerId: string; fullNames: string[] }) =>
      sourceControlApi.syncRepos(workspaceId!, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: sourceControlKeys.repos(variables.providerId),
      });
    },
  });
}

export function useUpdateSourceControlMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSourceControlInput }) =>
      sourceControlApi.updateProvider(workspaceId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}

export function useTestSourceControlMutation() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => sourceControlApi.testProvider(workspaceId!, id),
  });
}

export function useImportRepositoryMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ providerId, repoFullName }: { providerId: string; repoFullName: string }) =>
      sourceControlApi.importRepository(workspaceId!, providerId, repoFullName),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: sourceControlKeys.repos(variables.providerId),
      });
    },
  });
}

export function useSendSourceControlTestEventMutation() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => sourceControlApi.sendTestEvent(workspaceId!, id),
  });
}

export function useDeleteSourceControlMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => sourceControlApi.deleteProvider(workspaceId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}
