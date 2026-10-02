'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamKeys } from './keys';
import { listTeams, getTeam, getTeamMembers, createTeam, updateTeam, deleteTeam } from './api';
import type { CreateTeamPayload, UpdateTeamPayload } from './types';

function useInvalidateTeamDependencies() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: teamKeys.all }),
    ]);
}

export function useTeamsQuery() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: listTeams,
  });
}

export function useTeamQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => getTeam(id),
    enabled: enabled && id.length > 0,
  });
}

export function useTeamMembersQuery(teamId: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: () => getTeamMembers(teamId),
    enabled: enabled && teamId.length > 0,
  });
}

export function useCreateTeamMutation() {
  const invalidate = useInvalidateTeamDependencies();
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => createTeam(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTeamMutation() {
  const invalidate = useInvalidateTeamDependencies();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTeamPayload }) =>
      updateTeam(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTeamMutation() {
  const invalidate = useInvalidateTeamDependencies();
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: invalidate,
  });
}
