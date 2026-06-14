'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { repositoryKeys } from './keys';
import { repositoriesApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateSourceControlInput } from '@/commons/schemas/source-control.schema';

export function useRepositoriesQuery(params: ListParams & { imported?: boolean }) {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: repositoryKeys.list(params), queryFn: () => repositoriesApi.list(workspaceId!, params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData, enabled: !!workspaceId });
}

export function useSourceControlsQuery() {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: repositoryKeys.sourceControls(), queryFn: () => repositoriesApi.listSourceControls(workspaceId!), staleTime: STALE.DEFAULT, enabled: !!workspaceId });
}

export function useCreateSourceControlMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateSourceControlInput) => repositoriesApi.createSourceControl(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: repositoryKeys.sourceControls() }),
  });
}

export function useDeleteSourceControlMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => repositoriesApi.deleteSourceControl(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: repositoryKeys.sourceControls() }),
  });
}

export function useReposQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: repositoryKeys.list(params),
    queryFn: () => repositoriesApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

export function useUpdateRepositoryMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { projectId?: string } }) =>
      repositoriesApi.update(workspaceId!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: repositoryKeys.all });
    },
  });
}

export function useRepositoryBranchesQuery(repoId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: repositoryKeys.branches(repoId),
    queryFn: () => repositoriesApi.listBranches(workspaceId!, repoId),
    enabled: !!workspaceId && !!repoId,
    staleTime: STALE.SHORT,
  });
}
