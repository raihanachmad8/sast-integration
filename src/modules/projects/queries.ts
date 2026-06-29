'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import type { ProjectListQuery } from '@/commons/schemas/project.schema';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { projectsApi } from './api';
import { projectKeys } from './keys';
import type { ProjectFormInput } from './types';


/**
 * Query hook for fetching all projects in the current workspace.
 * Stale time: 30 seconds (FILTERED) — filter-sensitive queries need shorter cache
 * to ensure fresh data when users switch between filter combinations.
 */
export function useProjectsQuery(params: Partial<Omit<ProjectListQuery, 'workspace_id' | 'order'>> & { order?: string }) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: projectKeys.list(workspaceId!, params),
    queryFn: () => projectsApi.list(workspaceId!, params),
    staleTime: STALE.FILTERED,
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
    staleTime: STALE.SHORT,
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
