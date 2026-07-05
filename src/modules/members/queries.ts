'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import type { MemberListQuery } from '@/commons/schemas/member.schema';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { membersApi, type Member } from './api';
import { memberKeys } from './keys';

type MembersQueryData = PaginatedResponse<Member>;
/** Query hook for fetching all members in a workspace. */
export function useMembersQuery(params?: Partial<Omit<MemberListQuery, 'workspace_id'>>, enabled?: boolean) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: memberKeys.list(workspaceId!, params),
    queryFn: () => membersApi.list(workspaceId!, params),
    enabled: enabled !== undefined ? enabled && !!workspaceId : !!workspaceId,
    staleTime: STALE.FILTER,
    placeholderData: keepPreviousData,
  });
}

/** Mutation hook for updating a member's role with optimistic update. */
export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      membersApi.changeRole(workspaceId!, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.all });
      const previous = queryClient.getQueriesData<MembersQueryData>({ queryKey: memberKeys.all });
      queryClient.setQueriesData<MembersQueryData>({ queryKey: memberKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((m) => (m.userId === userId ? { ...m, role } : m)),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

/** Mutation hook for removing a member from the workspace with optimistic update. */
export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (userId: string) => membersApi.remove(workspaceId!, userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.all });
      const previous = queryClient.getQueriesData<MembersQueryData>({ queryKey: memberKeys.all });
      queryClient.setQueriesData<MembersQueryData>({ queryKey: memberKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((m) => m.userId !== userId),
          meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) },
        };
      });
      return { previous };
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}
