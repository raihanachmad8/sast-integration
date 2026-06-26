'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { sourceControlApi } from './api';
import { sourceControlKeys } from './keys';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
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
    queryFn: () => sourceControlApi.listRepos(workspaceId!, providerId, params ? { page: params.page, perPage: params.perPage, search: params.search } : undefined),
    enabled: !!workspaceId && !!providerId,
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
    mutationFn: (payload: { provider: string; name: string; credentials?: Record<string, unknown> }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.addProvider(workspaceId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}

/**
 * Mutation hook for syncing a single SCM provider — calls the real sync endpoint
 * and invalidates the repos cache on success.
 */
export function useSyncProviderMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (providerId: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.syncProvider(workspaceId, providerId);
    },
    onSuccess: (_data, _providerId) => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.allRepos() });
    },
  });
}

export function useUpdateSourceControlMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSourceControlInput }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.updateProvider(workspaceId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}

export function useTestSourceControlMutation() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.testProvider(workspaceId, id);
    },
  });
}

export function useImportRepositoryMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ providerId, sourceRepositoryId, projectId }: { providerId: string; sourceRepositoryId: string; projectId?: string }) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.importRepository(workspaceId, providerId, sourceRepositoryId, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.allRepos() });
    },
  });
}

export function useUninstallRepositoryMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (importId: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.uninstallRepository(workspaceId, importId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.allRepos() });
    },
  });
}

export function useSendSourceControlTestEventMutation() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.sendTestEvent(workspaceId, id);
    },
  });
}

export function useDeleteSourceControlMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.deleteProvider(workspaceId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}

export function useDisconnectSourceControlMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => {
      if (!workspaceId) throw new Error('No workspace selected');
      return sourceControlApi.disconnectProvider(workspaceId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.providers() });
    },
  });
}
