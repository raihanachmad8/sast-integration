'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from './keys';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './api';
import { projectApiTokensApi, type CreateApiTokenResult } from './api-tokens';
import type { CreateProjectPayload, UpdateProjectPayload } from './types';
import { useSessionQuery } from '@/modules/auth/queries';

function useInvalidateProjectDependencies() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: listProjects,
  });
}

export function useProjectQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCreateProjectMutation() {
  const invalidate = useInvalidateProjectDependencies();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectMutation() {
  const invalidate = useInvalidateProjectDependencies();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) =>
      updateProject(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteProjectMutation() {
  const invalidate = useInvalidateProjectDependencies();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: invalidate,
  });
}

// --- API Tokens ---

export function useApiTokensQuery(projectId: string) {
  const session = useSessionQuery();
  const token = session.data?.accessToken;

  return useQuery({
    queryKey: projectKeys.apiTokens(projectId),
    queryFn: () => projectApiTokensApi.list(projectId, token!),
    enabled: !!token && projectId.length > 0,
  });
}

export function useCreateApiTokenMutation(projectId: string) {
  const session = useSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; permissions?: string[]; expiresInDays?: number | null }) => {
      if (!session.data?.accessToken) throw new Error('Session expired. Sign in again.');
      return projectApiTokensApi.create(projectId, session.data.accessToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.apiTokens(projectId) });
    },
  });
}

export function useRevokeApiTokenMutation(projectId: string) {
  const session = useSessionQuery();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) => {
      if (!session.data?.accessToken) throw new Error('Session expired. Sign in again.');
      return projectApiTokensApi.revoke(projectId, tokenId, session.data.accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.apiTokens(projectId) });
    },
  });
}
