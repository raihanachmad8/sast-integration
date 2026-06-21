'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { teamsApi } from './api';
import { teamKeys } from './keys';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';
import type { TeamFormInput } from './types';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for paginated teams in the current workspace.
 *
 * @param params - Pagination and filter parameters for team listing.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTeamsQuery({ page: 1, perPage: 20 });
 * ```
 */
export function useTeamsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: teamKeys.list(params),
    queryFn: () => teamsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for fetching a single team by ID.
 *
 * @param teamId - The team ID to fetch. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: team } = useTeamQuery('team-abc');
 * ```
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
 *
 * @param teamId - The team ID to fetch members for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: members } = useTeamMembersQuery('team-abc');
 * ```
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
 * Invalidates all team queries on success so the new team appears in lists.
 *
 * @example
 * ```tsx
 * const createMutation = useCreateTeamMutation();
 * createMutation.mutate({ name: 'Security Team', memberIds: ['u1', 'u2'] });
 * ```
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
 * Invalidates all team queries on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateTeamMutation();
 * updateMutation.mutate({ id: 'team-1', payload: { name: 'Renamed Team' } });
 * ```
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
 * Invalidates all team queries on success.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteTeamMutation();
 * deleteMutation.mutate('team-abc');
 * ```
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
