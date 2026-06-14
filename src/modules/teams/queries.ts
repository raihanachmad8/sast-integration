'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { teamsApi } from './api';
import { teamKeys } from './keys';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { TeamFormInput } from './types';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for fetching all teams in the current workspace.
 * Stale time: 5 minutes.
 */
export function useTeamsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: teamKeys.list(params),
    queryFn: () => teamsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

/**
 * Query hook for fetching a single team by ID.
 * @param teamId - The team ID to fetch. Skipped if empty.
 */
export function useTeamQuery(teamId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => teamsApi.get(workspaceId!, teamId),
    enabled: !!teamId && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Query hook for fetching members of a specific team.
 * @param teamId - The team ID to fetch members for. Skipped if empty.
 */
export function useTeamMembersQuery(teamId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: () => teamsApi.getMembers(workspaceId!, teamId),
    enabled: !!teamId && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for creating a new team.
 * Invalidates the teams list on success.
 */
export function useCreateTeamMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: (input: TeamFormInput) => teamsApi.create(workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

/**
 * Mutation hook for updating an existing team.
 * Invalidates the teams list on success.
 */
export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TeamFormInput }) =>
      teamsApi.update(workspaceId!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

/**
 * Mutation hook for deleting a team.
 * Invalidates the teams list on success.
 */
export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: (id: string) => teamsApi.delete(workspaceId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
