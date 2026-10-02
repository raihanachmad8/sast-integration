'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sourceControlKeys } from './keys';
import {
  createSourceControl,
  deleteRepository,
  deleteSourceControl,
  importRepository,
  listRepos,
  listSourceControls,
  sendSourceControlTestEvent,
  syncSourceControl,
  testSourceControl,
  updateSourceControl,
} from './api';
import type { SourceControl } from './api';
import type { ImportRepositoryPayload, RepoCatalog, SourceControlPayload } from './api';
import { useSessionQuery } from '@/modules/auth/queries';

export function useSourceControlsQuery(workspaceId: string) {
  const session = useSessionQuery();

  return useQuery({
    queryKey: sourceControlKeys.list(workspaceId),
    queryFn: () => listSourceControls(workspaceId),
    enabled: workspaceId.length > 0 && !!session.data,
  });
}

export function useCreateSourceControlMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SourceControlPayload) => createSourceControl(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.list(workspaceId) });
    },
  });
}

export function useUpdateSourceControlMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, payload }: { providerId: string; payload: Partial<SourceControlPayload> }) =>
      updateSourceControl(workspaceId, providerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.list(workspaceId) });
    },
  });
}

export function useDeleteSourceControlMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: string) => deleteSourceControl(workspaceId, providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.repos(workspaceId) });
    },
  });
}



export function useReposQuery(workspaceId: string) {
  return useQuery({
    queryKey: sourceControlKeys.repos(workspaceId),
    queryFn: () => listRepos(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useImportRepositoryMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImportRepositoryPayload) => importRepository(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.repos(workspaceId) });
    },
  });
}

export function useDeleteRepositoryMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, repoId }: { projectId: string; repoId: string }) =>
      deleteRepository(workspaceId, projectId, repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.repos(workspaceId) });
    },
  });
}

export function useTestSourceControlMutation(workspaceId: string) {
  return useMutation({
    mutationFn: (providerId: string) => testSourceControl(workspaceId, providerId),
  });
}

export function useSyncSourceControlMutation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: string) => syncSourceControl(workspaceId, providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.repos(workspaceId) });
    },
  });
}

export function useSendSourceControlTestEventMutation(workspaceId: string) {
  return useMutation({
    mutationFn: (eventType: 'push' | 'pull_request') => sendSourceControlTestEvent(workspaceId, eventType),
  });
}

export type { SourceControl, RepoCatalog };
