'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { projectsApi } from './api';
import { projectKeys } from './keys';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ProjectFormInput } from './types';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for fetching all projects in the current workspace.
 * Stale time: 5 minutes.
 */
export function useProjectsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

/**
 * Query hook for fetching a single project by ID.
 * @param projectId - The project ID to fetch. Skipped if empty.
 */
export function useProjectQuery(projectId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.get(workspaceId!, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for creating a new project.
 * Invalidates the projects list on success.
 */
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: (input: ProjectFormInput) => projectsApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Mutation hook for updating an existing project.
 * Invalidates the projects list on success.
 */
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProjectFormInput }) =>
      projectsApi.update(workspaceId!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Mutation hook for deleting a project.
 * Invalidates the projects list on success.
 */
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: (projectId: string) =>
      projectsApi.delete(workspaceId!, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
