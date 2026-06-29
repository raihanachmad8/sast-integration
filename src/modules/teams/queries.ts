'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import type { TeamListQuery } from '@/commons/schemas/team.schema';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { teamsApi } from './api';
import { teamKeys } from './keys';
import type { TeamFormInput } from './types';


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
export function useTeamsQuery(params?: Partial<TeamListQuery>, enabled?: boolean) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: teamKeys.list(workspaceId!, params),
    queryFn: () => teamsApi.list(workspaceId!, params),
    enabled: enabled !== undefined ? enabled && !!workspaceId : !!workspaceId,
    staleTime: STALE.FILTERED,
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
    staleTime: STALE.FILTER,
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
