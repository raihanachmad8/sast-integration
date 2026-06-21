'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { repositoryKeys } from './keys';
import { repositoriesApi } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateSourceControlInput } from '@/commons/schemas/source-control.schema';

/**
 * Query hook for paginated repositories in the current workspace.
 * Supports filtering by imported status. Uses keepPreviousData for smooth transitions.
 *
 * @param params - Pagination and filter parameters, including optional `imported` flag.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRepositoriesQuery({ page: 1, imported: true });
 * ```
 */
export function useRepositoriesQuery(params: ListParams & { imported?: boolean }) {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: repositoryKeys.list(params), queryFn: () => repositoriesApi.list(workspaceId!, params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData, enabled: !!workspaceId });
}

/**
 * Query hook for fetching all source control integrations in the workspace.
 * Returns configured Git providers (GitHub, GitLab, etc.).
 *
 * @example
 * ```tsx
 * const { data: integrations, isLoading } = useSourceControlsQuery();
 * ```
 */
export function useSourceControlsQuery() {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: repositoryKeys.sourceControls(), queryFn: () => repositoriesApi.listSourceControls(workspaceId!), staleTime: STALE.DEFAULT, enabled: !!workspaceId });
}

/**
 * Mutation hook for creating a new source control integration.
 * Invalidates the source controls list on success.
 *
 * @example
 * ```tsx
 * const createMutation = useCreateSourceControlMutation();
 * createMutation.mutate({ provider: 'github', token: 'ghp_...' });
 * ```
 */
export function useCreateSourceControlMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateSourceControlInput) => repositoriesApi.createSourceControl(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: repositoryKeys.sourceControls() }),
  });
}

/**
 * Mutation hook for deleting a source control integration.
 * Invalidates the source controls list on success.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteSourceControlMutation();
 * deleteMutation.mutate('sc-123');
 * ```
 */
export function useDeleteSourceControlMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => repositoriesApi.deleteSourceControl(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: repositoryKeys.sourceControls() }),
  });
}

/**
 * Query hook for paginated repositories in the current workspace.
 * Uses keepPreviousData to maintain layout stability during page changes.
 *
 * @param params - Pagination and filter parameters for repository listing.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useReposQuery({ page: 1, perPage: 20 });
 * ```
 */
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

/**
 * Mutation hook for updating a repository's project assignment.
 * Invalidates all repository queries on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateRepositoryMutation();
 * updateMutation.mutate({ id: 'repo-1', data: { projectId: 'proj-abc' } });
 * ```
 */
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

/**
 * Query hook for fetching branches of a specific repository.
 * Uses STALE.SHORT since branches can change frequently.
 *
 * @param repoId - The repository ID to fetch branches for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: branches } = useRepositoryBranchesQuery('repo-1');
 * ```
 */
export function useRepositoryBranchesQuery(repoId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: repositoryKeys.branches(repoId),
    queryFn: () => repositoriesApi.listBranches(workspaceId!, repoId),
    enabled: !!workspaceId && !!repoId,
    staleTime: STALE.SHORT,
  });
}
